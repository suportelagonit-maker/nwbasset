<?php

namespace App\Domain\Dashboard\Queries;

use Illuminate\Support\Facades\DB;
use stdClass;

class DashboardResumoQuery
{
    public function run(?array $empresaIds = null, ?int $filialId = null): stdClass
    {
        $query = DB::table('bens_patrimoniais as bp')
            ->selectRaw('COUNT(*)::int as total_bens')
            ->selectRaw('COALESCE(SUM(bp.valor_aquisicao), 0)::numeric(15,2) as valor_total_patrimonio')
            ->selectRaw("COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM depreciacoes_bens db WHERE db.bem_patrimonial_id = bp.id))::int as bens_depreciados")
            ->selectRaw("COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(bp.numero_tombo), ''), '') = '')::int as bens_sem_plaqueta");

        if (! empty($empresaIds)) {
            $query->whereIn('bp.empresa_id', $empresaIds);
        }

        if ($filialId !== null) {
            $query->where('bp.filial_id', $filialId);
        }

        $resumo = $query->first();

        $inventariosAbertos = DB::table('inventarios')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('filial_id', $filialId))
            ->whereIn('status', ['ABERTO', 'EM_ANDAMENTO'])
            ->count();

        $divergenciasAbertas = DB::table('divergencias_inventario as di')
            ->join('inventarios as i', 'i.id', '=', 'di.inventario_id')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('i.empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('i.filial_id', $filialId))
            ->whereIn('i.status', ['ABERTO', 'EM_ANDAMENTO'])
            ->count();

        $totalEmpresas = DB::table('empresas')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('id', $empresaIds))
            ->count();

        $totalUnidades = DB::table('unidades_administrativas')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('filial_id', $filialId))
            ->count();

        $totalDepartamentos = DB::table('departamentos')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('filial_id', $filialId))
            ->count();

        $totalLocais = DB::table('locais')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('empresa_id', $empresaIds))
            ->when($filialId !== null, fn ($q) => $q->where('filial_id', $filialId))
            ->count();

        $totalUsuarios = DB::table('usuarios_empresas')
            ->when(! empty($empresaIds), fn ($q) => $q->whereIn('empresa_id', $empresaIds))
            ->distinct('usuario_id')
            ->count('usuario_id');

        return (object) [
            'total_bens' => (int) ($resumo->total_bens ?? 0),
            'valor_total_patrimonio' => round((float) ($resumo->valor_total_patrimonio ?? 0), 2),
            'bens_depreciados' => (int) ($resumo->bens_depreciados ?? 0),
            'bens_sem_plaqueta' => (int) ($resumo->bens_sem_plaqueta ?? 0),
            'inventarios_abertos' => (int) $inventariosAbertos,
            'divergencias_abertas' => (int) $divergenciasAbertas,
            'total_empresas' => (int) $totalEmpresas,
            'total_unidades' => (int) $totalUnidades,
            'total_departamentos' => (int) $totalDepartamentos,
            'total_locais' => (int) $totalLocais,
            'total_usuarios' => (int) $totalUsuarios,
        ];
    }
}
