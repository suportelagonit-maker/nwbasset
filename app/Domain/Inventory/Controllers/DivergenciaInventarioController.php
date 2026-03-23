<?php

namespace App\Domain\Inventory\Controllers;

use App\Domain\Inventory\Models\DivergenciaInventario;
use App\Domain\Inventory\Requests\StoreDivergenciaInventarioRequest;
use App\Domain\Inventory\Requests\UpdateDivergenciaInventarioRequest;
use App\Domain\Inventory\Resources\DivergenciaInventarioResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DivergenciaInventarioController extends Controller
{
    public function index(Request $request)
    {
        $query = DivergenciaInventario::query()->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresaPorRelacao($query, 'inventario');

        if ($request->filled('inventario_id')) {
            $query->where('inventario_id', $request->integer('inventario_id'));
        }

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        if ($request->filled('tipo_divergencia')) {
            $query->where('tipo_divergencia', $request->string('tipo_divergencia')->toString());
        }

        return DivergenciaInventarioResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreDivergenciaInventarioRequest $request): DivergenciaInventarioResource
    {
        $divergencia = DivergenciaInventario::query()->create($request->validated());

        return new DivergenciaInventarioResource($divergencia);
    }

    public function show(DivergenciaInventario $divergencia): DivergenciaInventarioResource
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($divergencia, 'inventario');

        return new DivergenciaInventarioResource($divergencia);
    }

    public function update(
        UpdateDivergenciaInventarioRequest $request,
        DivergenciaInventario $divergencia
    ): DivergenciaInventarioResource {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($divergencia, 'inventario');
        $divergencia->update($request->validated());

        return new DivergenciaInventarioResource($divergencia->fresh());
    }

    public function destroy(DivergenciaInventario $divergencia): JsonResponse
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($divergencia, 'inventario');
        $divergencia->delete();

        return response()->json(['message' => 'Divergencia removida com sucesso.']);
    }
}
