<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\FechamentoDepreciacao;
use App\Domain\Depreciation\Services\CronogramaDepreciacaoService;
use App\Domain\Depreciation\Services\RazaoDepreciacaoService;
use App\Domain\Depreciation\Services\TabelaPadraoDepreciacaoService;
use App\Domain\Depreciation\Support\ParcelaDepreciacao;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Operacoes da depreciacao: apurar a competencia, fechar o mes, reabrir,
 * carregar a tabela da Receita e consultar a memoria de calculo de um bem.
 */
class DepreciacaoOperacaoController extends Controller
{
    public function __construct(
        private readonly RazaoDepreciacaoService $razaoService,
        private readonly CronogramaDepreciacaoService $cronogramaService,
        private readonly TabelaPadraoDepreciacaoService $tabelaPadraoService,
    ) {
    }

    /** Apura tudo que falta ate a competencia informada. */
    public function processar(Request $request): JsonResponse
    {
        $dados = $this->validarCompetencia($request);
        $empresaId = (int) $request->attributes->get('empresa_id');

        return response()->json([
            'message' => 'Depreciação apurada.',
            'data' => $this->razaoService->processarAte(
                $empresaId,
                $dados['competencia'],
                $dados['base_regra'],
            ),
        ]);
    }

    public function fechar(Request $request): JsonResponse
    {
        $dados = $this->validarCompetencia($request);
        $empresaId = (int) $request->attributes->get('empresa_id');

        // Apura antes de fechar: fechar um mes sem apurar guardaria zero.
        $this->razaoService->processarAte($empresaId, $dados['competencia'], $dados['base_regra']);

        $fechamento = $this->razaoService->fechar(
            $empresaId,
            $dados['competencia'],
            $dados['base_regra'],
            $request->user()?->id,
        );

        return response()->json([
            'message' => 'Competência '.Carbon::parse($fechamento->competencia)->format('m/Y').' fechada.',
            'data' => $fechamento,
        ]);
    }

    public function reabrir(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'competencia' => ['required', 'date'],
            'base_regra' => ['nullable', 'in:fiscal,contabil'],
            'motivo' => ['required', 'string', 'min:10', 'max:500'],
        ], [], [
            'motivo' => 'motivo da reabertura',
        ]);

        $fechamento = $this->razaoService->reabrir(
            (int) $request->attributes->get('empresa_id'),
            $dados['competencia'],
            $dados['base_regra'] ?? 'fiscal',
            $dados['motivo'],
            $request->user()?->id,
        );

        return response()->json([
            'message' => 'Competência reaberta.',
            'data' => $fechamento,
        ]);
    }

    public function fechamentos(Request $request): JsonResponse
    {
        $fechamentos = FechamentoDepreciacao::query()
            ->where('empresa_id', (int) $request->attributes->get('empresa_id'))
            ->orderByDesc('competencia')
            ->limit(60)
            ->get();

        return response()->json(['data' => $fechamentos]);
    }

    /** Carrega as taxas do Anexo III da IN RFB 1.700/2017 na empresa. */
    public function tabelaPadrao(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'sobrescrever' => ['nullable', 'boolean'],
        ]);

        $resultado = $this->tabelaPadraoService->aplicarNaEmpresa(
            (int) $request->attributes->get('empresa_id'),
            $request->user()?->id,
            (bool) ($dados['sobrescrever'] ?? false),
        );

        return response()->json([
            'message' => $resultado['criadas'] > 0
                ? 'Tabela da Receita Federal aplicada: '.$resultado['criadas'].' regra(s) gravada(s).'
                : 'Nenhuma regra nova: as taxas já estavam cadastradas.',
            'data' => $resultado,
        ]);
    }

    /**
     * Memoria de calculo do bem, mes a mes.
     *
     * E o que permite a alguem conferir o numero em vez de confiar nele —
     * e o que um auditor pede primeiro.
     */
    public function cronograma(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $dados = $request->validate([
            'base_regra' => ['nullable', 'in:fiscal,contabil'],
            'ate' => ['nullable', 'date'],
        ]);

        $base = $dados['base_regra'] ?? 'fiscal';
        $cronograma = $this->cronogramaService->gerar(
            $bem,
            $base,
            $dados['ate'] ?? $bem->data_aquisicao?->copy()->addYears(60)->toDateString() ?? now()->addYears(60)->toDateString(),
        );

        return response()->json([
            'data' => [
                'bem' => [
                    'id' => $bem->id,
                    'numero_tombo' => $bem->numero_tombo,
                    'descricao' => $bem->descricao,
                    'categoria' => $bem->categoria,
                    'data_aquisicao' => $bem->data_aquisicao?->toDateString(),
                    'data_inicio_uso' => $bem->data_inicio_uso?->toDateString(),
                ],
                'base_regra' => $base,
                'depreciavel' => $cronograma['depreciavel'],
                'motivo' => $cronograma['motivo'],
                'regra' => [
                    'nome' => $cronograma['regra']['nome_regra'] ?? null,
                    'origem' => $cronograma['regra']['origem_da_regra'] ?? null,
                    'metodo' => $cronograma['regra']['metodo'] ?? null,
                    'vida_util_anos' => $cronograma['regra']['vida_util_anos'] ?? null,
                    'taxa_anual_percentual' => $cronograma['regra']['taxa_anual_percentual'] ?? null,
                    'coeficiente_aceleracao' => $cronograma['regra']['coeficiente_aceleracao'] ?? 1,
                    'por_produto' => ! empty($cronograma['regra']['tipo_produto_id']),
                ],
                'valor_aquisicao' => $cronograma['valor_aquisicao'],
                'valor_residual' => $cronograma['valor_residual'],
                'valor_depreciavel' => $cronograma['valor_depreciavel'],
                'inicio' => $cronograma['inicio'],
                'meses_vida_util' => $cronograma['meses_vida_util'],
                'parcelas' => array_map(static fn (ParcelaDepreciacao $parcela): array => [
                    'competencia' => $parcela->competenciaIso(),
                    'mes' => $parcela->competencia->format('m/Y'),
                    'valor_depreciacao' => $parcela->valorDepreciacao,
                    'acumulado' => $parcela->acumulado,
                    'valor_contabil' => $parcela->valorContabil,
                    'meses_depreciados' => $parcela->mesesDepreciados,
                ], $cronograma['parcelas']),
            ],
        ]);
    }

    /** @return array{competencia: string, base_regra: string} */
    private function validarCompetencia(Request $request): array
    {
        $dados = $request->validate([
            'competencia' => ['required', 'date'],
            'base_regra' => ['nullable', 'in:fiscal,contabil'],
        ]);

        return [
            'competencia' => $dados['competencia'],
            'base_regra' => $dados['base_regra'] ?? 'fiscal',
        ];
    }
}
