<?php

namespace App\Domain\Inventory\Controllers;

use App\Domain\Inventory\Models\Inventario;
use App\Domain\Inventory\Requests\StoreInventarioRequest;
use App\Domain\Inventory\Requests\UpdateInventarioRequest;
use App\Domain\Inventory\Resources\InventarioResource;
use App\Domain\Inventory\Services\InventarioService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventarioController extends Controller
{
    public function __construct(private readonly InventarioService $inventarioService)
    {
    }

    public function index(Request $request)
    {
        $query = Inventario::query()->orderByDesc('data_inicio')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return InventarioResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreInventarioRequest $request): InventarioResource
    {
        $inventario = $this->inventarioService->criarInventario($request->validated());

        return new InventarioResource($inventario);
    }

    public function show(Inventario $inventario): InventarioResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($inventario);

        return new InventarioResource($inventario);
    }

    public function update(UpdateInventarioRequest $request, Inventario $inventario): InventarioResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($inventario);
        $inventario->update($request->validated());

        return new InventarioResource($inventario->fresh());
    }

    public function destroy(Inventario $inventario): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($inventario);
        $inventario->delete();

        return response()->json(['message' => 'Inventario removido com sucesso.']);
    }
}
