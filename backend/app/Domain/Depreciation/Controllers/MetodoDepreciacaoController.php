<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Requests\StoreMetodoDepreciacaoRequest;
use App\Domain\Depreciation\Requests\UpdateMetodoDepreciacaoRequest;
use App\Domain\Depreciation\Resources\MetodoDepreciacaoResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MetodoDepreciacaoController extends Controller
{
    public function index(Request $request)
    {
        $query = MetodoDepreciacao::query()->orderBy('nome');

        if ($request->filled('codigo')) {
            $query->where('codigo', $request->string('codigo')->toString());
        }

        return MetodoDepreciacaoResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreMetodoDepreciacaoRequest $request): MetodoDepreciacaoResource
    {
        $metodo = MetodoDepreciacao::query()->create($request->validated());

        return new MetodoDepreciacaoResource($metodo);
    }

    public function show(MetodoDepreciacao $metodoDepreciacao): MetodoDepreciacaoResource
    {
        return new MetodoDepreciacaoResource($metodoDepreciacao);
    }

    public function update(
        UpdateMetodoDepreciacaoRequest $request,
        MetodoDepreciacao $metodoDepreciacao
    ): MetodoDepreciacaoResource {
        $metodoDepreciacao->update($request->validated());

        return new MetodoDepreciacaoResource($metodoDepreciacao->fresh());
    }

    public function destroy(MetodoDepreciacao $metodoDepreciacao): JsonResponse
    {
        $metodoDepreciacao->delete();

        return response()->json(['message' => 'Metodo de depreciacao removido com sucesso.']);
    }
}
