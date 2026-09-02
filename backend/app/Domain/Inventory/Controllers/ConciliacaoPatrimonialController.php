<?php

namespace App\Domain\Inventory\Controllers;

use App\Domain\Inventory\Models\ConciliacaoPatrimonial;
use App\Domain\Inventory\Requests\StoreConciliacaoPatrimonialRequest;
use App\Domain\Inventory\Requests\UpdateConciliacaoPatrimonialRequest;
use App\Domain\Inventory\Resources\ConciliacaoPatrimonialResource;
use App\Domain\Inventory\Services\InventarioService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConciliacaoPatrimonialController extends Controller
{
    public function __construct(private readonly InventarioService $inventarioService)
    {
    }

    public function index(Request $request)
    {
        $query = ConciliacaoPatrimonial::query()->orderByDesc('data_conciliacao')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresaPorRelacao($query, 'inventario');

        if ($request->filled('inventario_id')) {
            $query->where('inventario_id', $request->integer('inventario_id'));
        }

        return ConciliacaoPatrimonialResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreConciliacaoPatrimonialRequest $request): ConciliacaoPatrimonialResource
    {
        $conciliacao = $this->inventarioService->registrarConciliacao($request->validated());

        return new ConciliacaoPatrimonialResource($conciliacao);
    }

    public function show(ConciliacaoPatrimonial $conciliacao): ConciliacaoPatrimonialResource
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($conciliacao, 'inventario');

        return new ConciliacaoPatrimonialResource($conciliacao);
    }

    public function update(
        UpdateConciliacaoPatrimonialRequest $request,
        ConciliacaoPatrimonial $conciliacao
    ): ConciliacaoPatrimonialResource {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($conciliacao, 'inventario');
        $conciliacao = $this->inventarioService->atualizarConciliacao($conciliacao, $request->validated());

        return new ConciliacaoPatrimonialResource($conciliacao);
    }

    public function destroy(ConciliacaoPatrimonial $conciliacao): JsonResponse
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($conciliacao, 'inventario');
        $conciliacao->delete();

        return response()->json(['message' => 'Conciliacao patrimonial removida com sucesso.']);
    }
}
