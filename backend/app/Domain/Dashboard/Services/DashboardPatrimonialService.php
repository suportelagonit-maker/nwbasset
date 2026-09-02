<?php

namespace App\Domain\Dashboard\Services;

use App\Domain\MultiCompany\Services\EmpresaContextService;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Dashboard\Queries\DashboardBensPorDepartamentoQuery;
use App\Domain\Dashboard\Queries\DashboardBensPorLocalQuery;
use App\Domain\Dashboard\Queries\DashboardEvolucaoPatrimonioQuery;
use App\Domain\Dashboard\Queries\DashboardResumoQuery;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class DashboardPatrimonialService
{
    public function __construct(
        private readonly EmpresaContextService $empresaContextService,
        private readonly DashboardResumoQuery $dashboardResumoQuery,
        private readonly DashboardBensPorLocalQuery $dashboardBensPorLocalQuery,
        private readonly DashboardBensPorDepartamentoQuery $dashboardBensPorDepartamentoQuery,
        private readonly DashboardEvolucaoPatrimonioQuery $dashboardEvolucaoPatrimonioQuery,
    ) {
    }

    private function resolveEmpresaIds(Usuario $usuario, ?int $empresaId = null): array
    {
        if ($empresaId !== null) {
            return [$empresaId];
        }

        $contextEmpresaId = $this->empresaContextService->getEmpresaAtual();

        if ($contextEmpresaId !== null) {
            return [$contextEmpresaId];
        }

        return $usuario->empresasAcessiveis()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->values()
            ->all();
    }

    private function buildCacheKey(string $prefix, Usuario $usuario, array $empresaIds, ?int $filialId = null): string
    {
        sort($empresaIds);

        return implode(':', [
            'dashboard',
            $prefix,
            'user',
            (string) $usuario->getKey(),
            'empresas',
            empty($empresaIds) ? 'all' : implode(',', $empresaIds),
            'filial',
            $filialId !== null ? (string) $filialId : 'all',
        ]);
    }

    public function totalBens(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): int
    {
        return $this->dashboardResumoQuery->run($this->resolveEmpresaIds($usuario, $empresaId), $filialId)->total_bens;
    }

    public function valorTotalPatrimonio(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): float
    {
        return $this->dashboardResumoQuery->run($this->resolveEmpresaIds($usuario, $empresaId), $filialId)->valor_total_patrimonio;
    }

    public function bensDepreciados(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): int
    {
        return $this->dashboardResumoQuery->run($this->resolveEmpresaIds($usuario, $empresaId), $filialId)->bens_depreciados;
    }

    public function bensSemPlaqueta(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): int
    {
        return $this->dashboardResumoQuery->run($this->resolveEmpresaIds($usuario, $empresaId), $filialId)->bens_sem_plaqueta;
    }

    public function inventariosAbertos(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): int
    {
        return $this->dashboardResumoQuery->run($this->resolveEmpresaIds($usuario, $empresaId), $filialId)->inventarios_abertos;
    }

    public function divergenciasAbertas(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): int
    {
        return $this->dashboardResumoQuery->run($this->resolveEmpresaIds($usuario, $empresaId), $filialId)->divergencias_abertas;
    }

    public function resumo(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): array
    {
        $empresaIds = $this->resolveEmpresaIds($usuario, $empresaId);
        $cacheKey = $this->buildCacheKey('resumo', $usuario, $empresaIds, $filialId);

        return Cache::remember($cacheKey, now()->addSeconds(10), function () use ($empresaIds, $filialId) {
            $resumo = $this->dashboardResumoQuery->run($empresaIds, $filialId);

            return [
                'total_bens' => $resumo->total_bens,
                'valor_total_patrimonio' => $resumo->valor_total_patrimonio,
                'bens_depreciados' => $resumo->bens_depreciados,
                'bens_sem_plaqueta' => $resumo->bens_sem_plaqueta,
                'inventarios_abertos' => $resumo->inventarios_abertos,
                'divergencias_abertas' => $resumo->divergencias_abertas,
                'total_empresas' => $resumo->total_empresas,
                'total_unidades' => $resumo->total_unidades,
                'total_departamentos' => $resumo->total_departamentos,
                'total_locais' => $resumo->total_locais,
                'total_usuarios' => $resumo->total_usuarios,
            ];
        });
    }

    public function bensPorLocal(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): Collection
    {
        $empresaIds = $this->resolveEmpresaIds($usuario, $empresaId);
        $cacheKey = $this->buildCacheKey('bens-por-local', $usuario, $empresaIds, $filialId);

        return collect(Cache::remember($cacheKey, now()->addSeconds(10), function () use ($empresaIds, $filialId) {
            return $this->dashboardBensPorLocalQuery->run($empresaIds, $filialId)->all();
        }));
    }

    public function bensPorDepartamento(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): Collection
    {
        $empresaIds = $this->resolveEmpresaIds($usuario, $empresaId);
        $cacheKey = $this->buildCacheKey('bens-por-departamento', $usuario, $empresaIds, $filialId);

        return collect(Cache::remember($cacheKey, now()->addSeconds(10), function () use ($empresaIds, $filialId) {
            return $this->dashboardBensPorDepartamentoQuery->run($empresaIds, $filialId)->all();
        }));
    }

    public function overview(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): array
    {
        $empresaIds = $this->resolveEmpresaIds($usuario, $empresaId);
        $cacheKey = $this->buildCacheKey('overview', $usuario, $empresaIds, $filialId);

        return Cache::remember($cacheKey, now()->addSeconds(10), function () use ($usuario, $empresaId, $filialId) {
            return [
                'resumo' => $this->resumo($usuario, $empresaId, $filialId),
                'bens_por_local' => $this->bensPorLocal($usuario, $empresaId, $filialId)->values()->all(),
                'bens_por_departamento' => $this->bensPorDepartamento($usuario, $empresaId, $filialId)->values()->all(),
            ];
        });
    }

    public function evolucaoPatrimonio(Usuario $usuario, ?int $empresaId = null, ?int $filialId = null): Collection
    {
        return $this->dashboardEvolucaoPatrimonioQuery->run($this->resolveEmpresaIds($usuario, $empresaId), $filialId);
    }
}
