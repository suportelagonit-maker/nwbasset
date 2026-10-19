<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Services\CiapService;
use App\Domain\Depreciation\Services\SpedBlocoGService;
use App\Domain\Organization\Models\Empresa;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * CIAP: credito de ICMS do ativo, apropriado em 48 meses (Bloco G).
 *
 * So e relevante para contribuinte de ICMS. A apuracao consolidada e uma
 * CONFERENCIA do que iria para o Bloco G do EFD ICMS/IPI — nao e o arquivo
 * SPED validado, que depende do leiaute vigente e da conferencia do contador.
 */
class CiapController extends Controller
{
    public function __construct(
        private readonly CiapService $service,
        private readonly SpedBlocoGService $sped,
    ) {
    }

    /** Cronograma de 48 parcelas de um bem. */
    public function doBem(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $this->garantirEmpresa($request, $bem);

        return response()->json(['data' => $this->service->cronogramaDoBem($bem)]);
    }

    /** Informa o credito de ICMS do bem (liga o CIAP para ele). */
    public function definirCredito(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $this->garantirEmpresa($request, $bem);

        $dados = $request->validate([
            'valor_credito_icms' => ['nullable', 'numeric', 'min:0'],
            'data_credito_icms' => ['nullable', 'date'],
        ]);

        $bem->forceFill([
            'valor_credito_icms' => $dados['valor_credito_icms'] ?? null,
            'data_credito_icms' => $dados['data_credito_icms'] ?? null,
        ])->save();

        return response()->json([
            'message' => 'Crédito de ICMS do bem atualizado.',
            'data' => $this->service->cronogramaDoBem($bem->fresh()),
        ]);
    }

    /** Apuracao consolidada de uma competencia (conferencia do Bloco G). */
    public function apuracao(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'competencia' => ['required', 'date'],
        ]);

        return response()->json([
            'data' => $this->service->apuracaoDaCompetencia(
                (int) $request->attributes->get('empresa_id'),
                $dados['competencia'],
            ),
        ]);
    }

    /** Informa o fator de proporcionalidade de uma competencia. */
    public function definirFator(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'competencia' => ['required', 'date'],
            'saidas_tributadas' => ['required', 'numeric', 'min:0'],
            'saidas_totais' => ['required', 'numeric', 'min:0'],
        ]);

        $fator = $this->service->definirFator(
            (int) $request->attributes->get('empresa_id'),
            $dados['competencia'],
            (float) $dados['saidas_tributadas'],
            (float) $dados['saidas_totais'],
        );

        return response()->json([
            'message' => 'Fator de proporcionalidade salvo.',
            'data' => ['fator' => (float) $fator->fator],
        ]);
    }

    /**
     * RASCUNHO do Bloco G (EFD ICMS/IPI) de uma competência.
     *
     * Sem ?formato=txt devolve JSON com aviso + pendências + as linhas.
     * Com ?formato=txt baixa o rascunho como texto (nome do arquivo marcado
     * como RASCUNHO). Em nenhum caso é um arquivo SPED validado — o contador
     * confere e valida no PVA antes de qualquer entrega.
     */
    public function blocoG(Request $request): JsonResponse|Response
    {
        $dados = $request->validate([
            'competencia' => ['required', 'date'],
            'documentos' => ['nullable', 'array'],
        ]);

        $empresaId = (int) $request->attributes->get('empresa_id');
        $empresa = Empresa::query()->findOrFail($empresaId);

        $resultado = $this->sped->gerar($empresa, $dados['competencia'], [
            'documentos' => $dados['documentos'] ?? [],
        ]);

        if ($request->query('formato') === 'txt') {
            $nome = 'RASCUNHO-blocoG-' . str_replace('/', '', $resultado['mes']) . '.txt';

            return response($resultado['conteudo'], 200, [
                'Content-Type' => 'text/plain; charset=utf-8',
                'Content-Disposition' => 'attachment; filename="' . $nome . '"',
                'X-Rascunho' => 'nao-transmitir',
            ]);
        }

        return response()->json(['data' => $resultado]);
    }

    private function garantirEmpresa(Request $request, BemPatrimonial $bem): void
    {
        $empresaId = (int) $request->attributes->get('empresa_id');
        abort_if($empresaId > 0 && (int) $bem->empresa_id !== $empresaId, 404);
    }
}
