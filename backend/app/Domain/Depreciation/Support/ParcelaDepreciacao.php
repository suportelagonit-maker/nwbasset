<?php

namespace App\Domain\Depreciation\Support;

use Illuminate\Support\Carbon;

/**
 * Uma linha do cronograma: o que o bem deprecia em um mes.
 *
 * `competencia` e sempre o dia 1 do mes — e assim que a contabilidade
 * enxerga o periodo, e e por isso que duas rodadas do calculo no mesmo mes
 * nao duplicam nada.
 */
final readonly class ParcelaDepreciacao
{
    public function __construct(
        public Carbon $competencia,
        public float $valorDepreciacao,
        public float $acumulado,
        public float $valorContabil,
        public int $mesesDepreciados,
    ) {
    }

    public function competenciaIso(): string
    {
        return $this->competencia->toDateString();
    }

    public function ultimoDiaDoMes(): string
    {
        return $this->competencia->copy()->endOfMonth()->toDateString();
    }
}
