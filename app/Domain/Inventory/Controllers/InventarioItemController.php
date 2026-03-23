<?php

namespace App\Domain\Inventory\Controllers;

use App\Domain\Inventory\Models\InventarioItem;
use App\Domain\Inventory\Requests\StoreInventarioItemRequest;
use App\Domain\Inventory\Requests\UpdateInventarioItemRequest;
use App\Domain\Inventory\Resources\InventarioItemResource;
use App\Domain\Inventory\Services\InventarioService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventarioItemController extends Controller
{
    public function __construct(private readonly InventarioService $inventarioService)
    {
    }

    public function index(Request $request)
    {
        $query = InventarioItem::query()->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresaPorRelacao($query, 'inventario');

        if ($request->filled('inventario_id')) {
            $query->where('inventario_id', $request->integer('inventario_id'));
        }

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        if ($request->filled('localizado')) {
            $query->where('localizado', filter_var($request->input('localizado'), FILTER_VALIDATE_BOOLEAN));
        }

        return InventarioItemResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreInventarioItemRequest $request): InventarioItemResource
    {
        $item = InventarioItem::query()->create([
            ...$request->validated(),
            'localizado' => $request->validated()['localizado'] ?? false,
        ]);

        return new InventarioItemResource($item);
    }

    public function show(InventarioItem $inventarioItem): InventarioItemResource
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($inventarioItem, 'inventario');

        return new InventarioItemResource($inventarioItem);
    }

    public function update(UpdateInventarioItemRequest $request, InventarioItem $inventarioItem): InventarioItemResource
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($inventarioItem, 'inventario');
        $item = $this->inventarioService->atualizarInventarioItem($inventarioItem, $request->validated());

        return new InventarioItemResource($item);
    }

    public function destroy(InventarioItem $inventarioItem): JsonResponse
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($inventarioItem, 'inventario');
        $inventarioItem->delete();

        return response()->json(['message' => 'Item de inventario removido com sucesso.']);
    }
}
