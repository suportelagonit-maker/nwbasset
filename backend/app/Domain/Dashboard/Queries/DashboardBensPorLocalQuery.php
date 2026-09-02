<?php

namespace App\Domain\Dashboard\Queries;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardBensPorLocalQuery
{
    public function run(?array $empresaIds = null, ?int $filialId = null): Collection
    {
        return DB::table('bens_patrimoniais as bp')
            ->join('locais as l', 'l.id', '=', 'bp.local_id')
            ->selectRaw('bp.local_id')
            ->selectRaw('l.nome as local_nome')
            ->selectRaw('l.codigo as local_codigo')
            ->selectRaw('COUNT(*)::int as total_bens')
            ->selectRaw('COALESCE(SUM(bp.valor_aquisicao), 0)::numeric(15,2) as valor_total')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('bp.empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('bp.filial_id', $filialId))
            ->groupBy('bp.local_id', 'l.nome', 'l.codigo')
            ->orderByDesc('total_bens')
            ->orderBy('l.nome')
            ->get()
            ->map(fn ($row) => [
                'local_id' => (int) $row->local_id,
                'local' => $row->local_nome,
                'codigo' => $row->local_codigo,
                'total_bens' => (int) $row->total_bens,
                'valor_total' => round((float) $row->valor_total, 2),
            ]);
    }
}
