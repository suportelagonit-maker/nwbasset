<?php

namespace App\Domain\Dashboard\Controllers;

use App\Domain\Dashboard\Services\DashboardPatrimonialService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardPatrimonialController extends Controller
{
    public function __construct(private readonly DashboardPatrimonialService $dashboardPatrimonialService)
    {
    }

    private function resolveEmpresaId(Request $request): ?int
    {
        $empresaId = $request->filled('empresa_id')
            ? $request->integer('empresa_id')
            : (int) $request->header('X-Empresa-Id');

        if ($empresaId > 0 && ! $request->user()->pertenceAEmpresa($empresaId)) {
            abort(403, 'Usuario sem acesso a empresa informada.');
        }

        return $empresaId > 0 ? $empresaId : null;
    }

    public function resumo(Request $request): JsonResponse
    {
        return response()->json($this->dashboardPatrimonialService->resumo(
            $request->user(),
            $this->resolveEmpresaId($request),
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        ));
    }

    public function overview(Request $request): JsonResponse
    {
        return response()->json($this->dashboardPatrimonialService->overview(
            $request->user(),
            $this->resolveEmpresaId($request),
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        ));
    }

    public function bensPorLocal(Request $request): JsonResponse
    {
        return response()->json($this->dashboardPatrimonialService->bensPorLocal(
            $request->user(),
            $this->resolveEmpresaId($request),
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        ));
    }

    public function bensPorDepartamento(Request $request): JsonResponse
    {
        return response()->json($this->dashboardPatrimonialService->bensPorDepartamento(
            $request->user(),
            $this->resolveEmpresaId($request),
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        ));
    }

    public function evolucaoPatrimonio(Request $request): JsonResponse
    {
        return response()->json($this->dashboardPatrimonialService->evolucaoPatrimonio(
            $request->user(),
            $this->resolveEmpresaId($request),
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        ));
    }
}
