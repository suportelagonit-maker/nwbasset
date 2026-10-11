<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Models\FechamentoDepreciacao;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Support\ParcelaDepreciacao;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Razao mensal da depreciacao: grava o cronograma no banco, mes a mes,
 * por base (fiscal e societaria), e fecha a competencia.
 *
 * A diferenca para o motor antigo nao e de detalhe: antes existia uma
 * fotografia por bem e por data, com o ano inteiro de depreciacao assim que
 * o bem era cadastrado. Agora existe uma linha por bem, base e mes, com a
 * despesa DAQUELE mes — que e o que a contabilidade lanca e o que a ECD
 * espera.
 *
 * Recalculo e idempotente: rodar duas vezes a mesma competencia nao
 * duplica nem soma, atualiza. Competencia fechada nao e tocada.
 */
class RazaoDepreciacaoService
{
    public function __construct(
        private readonly CronogramaDepreciacaoService $cronograma,
    ) {
    }

    /**
     * Processa uma competencia inteira da empresa.
     *
     * @return array<string, mixed>
     */
    public function processarCompetencia(
        int $empresaId,
        string $competencia,
        string $baseRegra = 'fiscal',
    ): array {
        $mes = $this->competencia($competencia);

        if ($this->competenciaFechada($empresaId, $baseRegra, $mes)) {
            throw ValidationException::withMessages([
                'competencia' => 'A competência '.$mes->format('m/Y').' está fechada. Reabra antes de recalcular.',
            ]);
        }

        return DB::transaction(function () use ($empresaId, $mes, $baseRegra): array {
            $bens = BemPatrimonial::query()
                ->where('empresa_id', $empresaId)
                ->with('baixas')
                ->get();

            $gravados = 0;
            $semDepreciacao = 0;
            $total = 0.0;

            foreach ($bens as $bem) {
                $parcela = $this->cronograma->parcelaDaCompetencia($bem, $baseRegra, $mes->toDateString());

                if ($parcela === null) {
                    $semDepreciacao++;

                    continue;
                }

                $this->gravarParcela($bem, $baseRegra, $parcela);
                $gravados++;
                $total = round($total + $parcela->valorDepreciacao, 2);
            }

            return [
                'empresa_id' => $empresaId,
                'base_regra' => $baseRegra,
                'competencia' => $mes->toDateString(),
                'bens_avaliados' => $bens->count(),
                'bens_depreciados' => $gravados,
                'bens_sem_depreciacao' => $semDepreciacao,
                'valor_total' => $total,
            ];
        });
    }

    /**
     * Processa tudo o que falta, do primeiro mes em aberto ate a competencia
     * informada. E o que resolve a vida real: ninguem roda o sistema todo
     * mes desde o comeco, e o historico precisa existir para o acumulado
     * fazer sentido.
     *
     * @return array<string, mixed>
     */
    public function processarAte(
        int $empresaId,
        string $competenciaFinal,
        string $baseRegra = 'fiscal',
    ): array {
        $fim = $this->competencia($competenciaFinal);
        $inicio = $this->primeiraCompetenciaEmAberto($empresaId, $baseRegra) ?? $fim->copy();

        $competencias = [];
        $mes = $inicio->copy();
        $total = 0.0;
        $gravados = 0;

        while ($mes->lte($fim)) {
            if ($this->competenciaFechada($empresaId, $baseRegra, $mes)) {
                $mes->addMonth();

                continue;
            }

            $resultado = $this->processarCompetencia($empresaId, $mes->toDateString(), $baseRegra);
            $competencias[] = $resultado;
            $total = round($total + $resultado['valor_total'], 2);
            $gravados += $resultado['bens_depreciados'];
            $mes->addMonth();
        }

        return [
            'empresa_id' => $empresaId,
            'base_regra' => $baseRegra,
            'de' => $inicio->toDateString(),
            'ate' => $fim->toDateString(),
            'competencias_processadas' => count($competencias),
            'lancamentos' => $gravados,
            'valor_total' => $total,
            'detalhe' => $competencias,
        ];
    }

    /** Fecha a competencia: o mes para de ser recalculado. */
    public function fechar(int $empresaId, string $competencia, string $baseRegra, ?int $usuarioId = null): FechamentoDepreciacao
    {
        $mes = $this->competencia($competencia);

        return DB::transaction(function () use ($empresaId, $mes, $baseRegra, $usuarioId): FechamentoDepreciacao {
            $linhas = DepreciacaoBem::query()
                ->where('empresa_id', $empresaId)
                ->where('base_regra', $baseRegra)
                ->whereDate('competencia', $mes->toDateString());

            $fechamento = FechamentoDepreciacao::query()->updateOrCreate(
                ['empresa_id' => $empresaId, 'base_regra' => $baseRegra, 'competencia' => $mes->toDateString()],
                [
                    'bens_processados' => (clone $linhas)->count(),
                    'valor_total' => round((float) (clone $linhas)->sum('valor_depreciacao_periodo'), 2),
                    'fechado_em' => now(),
                    'fechado_por' => $usuarioId,
                    'reaberto_em' => null,
                    'reaberto_por' => null,
                    'motivo_reabertura' => null,
                ],
            );

            (clone $linhas)->update(['fechado_em' => now()]);

            app(LogOperacaoPatrimonialService::class)->registrar(
                'DEPRECIACAO_COMPETENCIA_FECHADA',
                $fechamento,
                $empresaId,
                [],
                $fechamento->toArray(),
            );

            return $fechamento->fresh();
        });
    }

    /** Reabre a competencia, com motivo — e um ato que fica registrado. */
    public function reabrir(int $empresaId, string $competencia, string $baseRegra, string $motivo, ?int $usuarioId = null): FechamentoDepreciacao
    {
        $mes = $this->competencia($competencia);

        $fechamento = FechamentoDepreciacao::query()
            ->where('empresa_id', $empresaId)
            ->where('base_regra', $baseRegra)
            ->whereDate('competencia', $mes->toDateString())
            ->first();

        if ($fechamento === null || ! $fechamento->estaFechado()) {
            throw ValidationException::withMessages([
                'competencia' => 'A competência '.$mes->format('m/Y').' não está fechada.',
            ]);
        }

        return DB::transaction(function () use ($fechamento, $empresaId, $mes, $baseRegra, $motivo, $usuarioId): FechamentoDepreciacao {
            $anterior = $fechamento->toArray();

            $fechamento->forceFill([
                'reaberto_em' => now(),
                'reaberto_por' => $usuarioId,
                'motivo_reabertura' => mb_substr($motivo, 0, 500),
            ])->save();

            DepreciacaoBem::query()
                ->where('empresa_id', $empresaId)
                ->where('base_regra', $baseRegra)
                ->whereDate('competencia', $mes->toDateString())
                ->update(['fechado_em' => null]);

            app(LogOperacaoPatrimonialService::class)->registrar(
                'DEPRECIACAO_COMPETENCIA_REABERTA',
                $fechamento,
                $empresaId,
                $anterior,
                $fechamento->toArray(),
            );

            return $fechamento->fresh();
        });
    }

    public function competenciaFechada(int $empresaId, string $baseRegra, Carbon $competencia): bool
    {
        return FechamentoDepreciacao::query()
            ->where('empresa_id', $empresaId)
            ->where('base_regra', $baseRegra)
            ->whereDate('competencia', $competencia->toDateString())
            ->whereNotNull('fechado_em')
            ->whereNull('reaberto_em')
            ->exists();
    }

    /**
     * De onde a apuracao recomeca: o mes seguinte ao ultimo FECHADO.
     *
     * Deliberadamente nao e "o mes seguinte ao ultimo calculado". Mes
     * aberto tem de refletir a regra vigente: se o contador corrigir uma
     * taxa hoje, os meses ainda nao fechados precisam ser recalculados — e
     * os fechados, nunca. E o fechamento, nao o calculo, que congela.
     */
    private function primeiraCompetenciaEmAberto(int $empresaId, string $baseRegra): ?Carbon
    {
        $ultimoFechado = FechamentoDepreciacao::query()
            ->where('empresa_id', $empresaId)
            ->where('base_regra', $baseRegra)
            ->whereNotNull('fechado_em')
            ->whereNull('reaberto_em')
            ->max('competencia');

        if ($ultimoFechado) {
            return $this->competencia((string) $ultimoFechado)->addMonth();
        }

        $maisAntigo = BemPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->selectRaw('LEAST(MIN(COALESCE(data_inicio_uso, data_aquisicao)), MIN(data_aquisicao)) as inicio')
            ->value('inicio');

        return $maisAntigo ? $this->competencia((string) $maisAntigo) : null;
    }

    private function gravarParcela(BemPatrimonial $bem, string $baseRegra, ParcelaDepreciacao $parcela): DepreciacaoBem
    {
        $cronograma = $this->cronograma->gerar($bem, $baseRegra, $parcela->competenciaIso());
        $regra = $cronograma['regra'];
        $metodoId = $regra['metodo_depreciacao_id'] ?? null;

        if (! $metodoId) {
            $metodoId = MetodoDepreciacao::query()->where('codigo', 'LINHA_RETA')->value('id');
        }

        return DepreciacaoBem::query()->updateOrCreate(
            [
                'bem_patrimonial_id' => $bem->id,
                'base_regra' => $baseRegra,
                'competencia' => $parcela->competenciaIso(),
            ],
            [
                'empresa_id' => $bem->empresa_id,
                'metodo_depreciacao_id' => $metodoId,
                'regra_depreciacao_id' => $regra['regra_id'] ?? null,
                'metodo' => (string) ($regra['metodo'] ?? 'linha_reta'),
                'valor_aquisicao' => $cronograma['valor_aquisicao'],
                'valor_residual' => $cronograma['valor_residual'],
                'vida_util_anos' => (int) ($regra['vida_util_anos'] ?? 0),
                'taxa_anual' => round((float) ($regra['taxa_anual_percentual'] ?? 0), 4),
                'valor_depreciacao_periodo' => $parcela->valorDepreciacao,
                'valor_depreciado_acumulado' => $parcela->acumulado,
                'valor_contabil' => $parcela->valorContabil,
                'meses_depreciados' => $parcela->mesesDepreciados,
                'data_calculo' => $parcela->ultimoDiaDoMes(),
            ],
        );
    }

    private function competencia(string $data): Carbon
    {
        return Carbon::parse($data)->startOfMonth()->startOfDay();
    }
}
