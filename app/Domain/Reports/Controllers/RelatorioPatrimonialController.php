<?php

namespace App\Domain\Reports\Controllers;

use App\Domain\Reports\Services\RelatorioPatrimonialService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RelatorioPatrimonialController extends Controller
{
    public function __construct(private readonly RelatorioPatrimonialService $relatorioPatrimonialService)
    {
    }

    public function bensPorLocal(Request $request): JsonResponse
    {
        return response()->json($this->relatorioPatrimonialService->relatorioBensPorLocal(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        ));
    }

    public function bensPorResponsavel(Request $request): JsonResponse
    {
        return response()->json($this->relatorioPatrimonialService->relatorioBensPorResponsavel(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
            $request->filled('filial_id') ? $request->integer('filial_id') : null,
        ));
    }

    public function depreciacao(Request $request): JsonResponse
    {
        return response()->json($this->relatorioPatrimonialService->relatorioDepreciacao(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
        ));
    }

    public function inventario(Request $request): JsonResponse
    {
        return response()->json($this->relatorioPatrimonialService->relatorioInventario(
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
        ));
    }

    public function divergencias(Request $request): JsonResponse
    {
        return response()->json($this->relatorioPatrimonialService->relatorioDivergencias(
            $request->filled('inventario_id') ? $request->integer('inventario_id') : null,
            $request->filled('empresa_id') ? $request->integer('empresa_id') : null,
        ));
    }
}
