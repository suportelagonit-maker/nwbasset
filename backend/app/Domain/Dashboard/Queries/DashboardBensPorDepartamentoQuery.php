<?php

namespace App\Domain\Dashboard\Queries;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardBensPorDepartamentoQuery
{
    public function run(?array $empresaIds = null, ?int $filialId = null): Collection
    {
        return DB::table('bens_patrimoniais as bp')
            ->join('departamentos as d', 'd.id', '=', 'bp.departamento_id')
            ->selectRaw('bp.departamento_id')
            ->selectRaw('d.nome as departamento_nome')
            ->selectRaw('d.codigo as departamento_codigo')
            ->selectRaw('COUNT(*)::int as total_bens')
            ->selectRaw('COALESCE(SUM(bp.valor_aquisicao), 0)::numeric(15,2) as valor_total')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('bp.empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('bp.filial_id', $filialId))
            ->groupBy('bp.departamento_id', 'd.nome', 'd.codigo')
            ->orderByDesc('total_bens')
            ->orderBy('d.nome')
            ->get()
            ->map(fn ($row) => [
                'departamento_id' => (int) $row->departamento_id,
                'departamento' => $row->departamento_nome,
                'codigo' => $row->departamento_codigo,
                'total_bens' => (int) $row->total_bens,
                'valor_total' => round((float) $row->valor_total, 2),
            ]);
    }
}
