<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\Depreciation\Models\ParametroDepreciacao;
use App\Domain\Depreciation\Requests\StoreParametroDepreciacaoRequest;
use App\Domain\Depreciation\Requests\UpdateParametroDepreciacaoRequest;
use App\Domain\Depreciation\Resources\ParametroDepreciacaoResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametroDepreciacaoController extends Controller
{
    public function index(Request $request)
    {
        $query = ParametroDepreciacao::query()->orderBy('empresa_id');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->integer('empresa_id'));
        }

        if ($request->filled('metodo_depreciacao_id')) {
            $query->where('metodo_depreciacao_id', $request->integer('metodo_depreciacao_id'));
        }

        return ParametroDepreciacaoResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreParametroDepreciacaoRequest $request): ParametroDepreciacaoResource
    {
        $parametro = ParametroDepreciacao::query()->create($request->safe()->except('empresa_metodo'));

        return new ParametroDepreciacaoResource($parametro);
    }

    public function show(ParametroDepreciacao $parametroDepreciacao): ParametroDepreciacaoResource
    {
        return new ParametroDepreciacaoResource($parametroDepreciacao);
    }

    public function update(
        UpdateParametroDepreciacaoRequest $request,
        ParametroDepreciacao $parametroDepreciacao
    ): ParametroDepreciacaoResource {
        $parametroDepreciacao->update($request->safe()->except('empresa_metodo'));

        return new ParametroDepreciacaoResource($parametroDepreciacao->fresh());
    }

    public function destroy(ParametroDepreciacao $parametroDepreciacao): JsonResponse
    {
        $parametroDepreciacao->delete();

        return response()->json(['message' => 'Parametro de depreciacao removido com sucesso.']);
    }
}
