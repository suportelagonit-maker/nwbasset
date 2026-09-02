<?php

namespace App\Domain\Dashboard\Queries;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardEvolucaoPatrimonioQuery
{
    public function run(?array $empresaIds = null, ?int $filialId = null): Collection
    {
        $rows = DB::table('bens_patrimoniais as bp')
            ->selectRaw("TO_CHAR(DATE_TRUNC('month', bp.data_aquisicao), 'YYYY-MM') as competencia")
            ->selectRaw('COUNT(*)::int as total_bens')
            ->selectRaw('COALESCE(SUM(bp.valor_aquisicao), 0)::numeric(15,2) as valor_mes')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('bp.empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('bp.filial_id', $filialId))
            ->whereNotNull('bp.data_aquisicao')
            ->groupByRaw("DATE_TRUNC('month', bp.data_aquisicao)")
            ->orderByRaw("DATE_TRUNC('month', bp.data_aquisicao)")
            ->get();

        $valorAcumulado = 0.0;
        $bensAcumulados = 0;

        return $rows->map(function ($row) use (&$valorAcumulado, &$bensAcumulados) {
            $valorMes = round((float) $row->valor_mes, 2);
            $totalBens = (int) $row->total_bens;

            $valorAcumulado += $valorMes;
            $bensAcumulados += $totalBens;

            return [
                'competencia' => $row->competencia,
                'total_bens_mes' => $totalBens,
                'valor_mes' => $valorMes,
                'total_bens_acumulado' => $bensAcumulados,
                'valor_acumulado' => round($valorAcumulado, 2),
            ];
        });
    }
}
