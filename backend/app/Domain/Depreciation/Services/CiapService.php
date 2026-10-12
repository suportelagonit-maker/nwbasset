<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\CiapFator;
use Illuminate\Support\Carbon;

/**
 * CIAP — apropriacao do credito de ICMS do ativo em 48 meses.
 *
 * Regra (LC 87/1996, art. 20, par. 5o): o ICMS pago na compra de um bem do
 * ativo e creditado em 48 parcelas mensais de 1/48, cada uma multiplicada
 * pelo fator do mes (saidas tributadas / saidas totais). E a base do Bloco
 * G do EFD ICMS/IPI.
 *
 * So entra no calculo o bem que tem credito de ICMS informado — entidade
 * sem operacao de ICMS (imune, por exemplo) simplesmente nao preenche.
 */
class CiapService
{
    private const PARCELAS = 48;

    /**
     * Cronograma de apropriacao de um bem: 48 competencias, com o fator de
     * cada mes e o valor apropriado.
     *
     * @return array<string, mixed>
     */
    public function cronogramaDoBem(BemPatrimonial $bem): array
    {
        $credito = (float) ($bem->valor_credito_icms ?? 0);

        if ($credito <= 0) {
            return [
                'tem_credito' => false,
                'valor_credito_icms' => 0.0,
                'parcelas' => [],
            ];
        }

        $inicio = $bem->data_credito_icms ?? $bem->data_aquisicao;
        $competencia = Carbon::parse($inicio ?: now())->startOfMonth();

        $fatores = $this->fatoresDaEmpresa($bem->empresa_id);
        $parcelaBase = round($credito / self::PARCELAS, 2);

        $parcelas = [];
        $acumulado = 0.0;

        for ($i = 1; $i <= self::PARCELAS; $i++) {
            $fator = $fatores[$competencia->toDateString()] ?? 1.0;

            // A ultima parcela absorve a sobra de centavos (so quando o fator
            // e cheio; com fator reduzido o nao-apropriado nao e arredondamento).
            $valorParcela = ($i === self::PARCELAS && $fator >= 1.0)
                ? round($credito - $acumulado, 2)
                : round($parcelaBase * $fator, 2);

            $acumulado = round($acumulado + $valorParcela, 2);

            $parcelas[] = [
                'parcela' => $i,
                'competencia' => $competencia->toDateString(),
                'mes' => $competencia->format('m/Y'),
                'fator' => round($fator, 6),
                'valor_apropriado' => $valorParcela,
                'acumulado' => $acumulado,
                'saldo' => round(max(0, $credito - $acumulado), 2),
            ];

            $competencia->addMonth();
        }

        return [
            'tem_credito' => true,
            'valor_credito_icms' => round($credito, 2),
            'parcela_mensal' => $parcelaBase,
            'total_apropriado' => $acumulado,
            'parcelas' => $parcelas,
        ];
    }

    /**
     * Apuracao consolidada de uma competencia: quanto cada bem apropria no
     * mes. E a conferencia do que iria para o Bloco G (registros G125).
     *
     * @return array<string, mixed>
     */
    public function apuracaoDaCompetencia(int $empresaId, string $competencia): array
    {
        $mes = Carbon::parse($competencia)->startOfMonth();
        $fator = $this->fatoresDaEmpresa($empresaId)[$mes->toDateString()] ?? 1.0;

        $bens = BemPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->whereNotNull('valor_credito_icms')
            ->where('valor_credito_icms', '>', 0)
            ->get();

        $linhas = [];
        $total = 0.0;

        foreach ($bens as $bem) {
            $cronograma = $this->cronogramaDoBem($bem);
            $parcela = collect($cronograma['parcelas'])->firstWhere('competencia', $mes->toDateString());

            if ($parcela === null) {
                continue;
            }

            $total = round($total + $parcela['valor_apropriado'], 2);
            $linhas[] = [
                'bem_patrimonial_id' => $bem->id,
                'numero_tombo' => $bem->numero_tombo,
                'descricao' => $bem->descricao,
                'parcela' => $parcela['parcela'],
                'credito_icms' => (float) $bem->valor_credito_icms,
                'valor_apropriado' => $parcela['valor_apropriado'],
            ];
        }

        return [
            'competencia' => $mes->toDateString(),
            'mes' => $mes->format('m/Y'),
            'fator' => round($fator, 6),
            'bens' => count($linhas),
            'total_apropriado' => $total,
            'linhas' => $linhas,
        ];
    }

    /** @return array<string, float> competencia (Y-m-d) => fator */
    private function fatoresDaEmpresa(int $empresaId): array
    {
        return CiapFator::query()
            ->where('empresa_id', $empresaId)
            ->get()
            ->mapWithKeys(fn (CiapFator $f): array => [
                Carbon::parse($f->competencia)->startOfMonth()->toDateString() => (float) $f->fator,
            ])
            ->all();
    }

    /** Grava (ou atualiza) o fator de uma competencia. */
    public function definirFator(int $empresaId, string $competencia, float $saidasTributadas, float $saidasTotais): CiapFator
    {
        $fator = $saidasTotais > 0 ? round($saidasTributadas / $saidasTotais, 6) : 1.0;

        return CiapFator::query()->updateOrCreate(
            ['empresa_id' => $empresaId, 'competencia' => Carbon::parse($competencia)->startOfMonth()->toDateString()],
            ['saidas_tributadas' => $saidasTributadas, 'saidas_totais' => $saidasTotais, 'fator' => $fator],
        );
    }
}
