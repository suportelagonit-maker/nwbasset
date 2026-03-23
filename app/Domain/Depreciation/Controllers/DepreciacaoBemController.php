<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Requests\StoreDepreciacaoBemRequest;
use App\Domain\Depreciation\Requests\UpdateDepreciacaoBemRequest;
use App\Domain\Depreciation\Resources\DepreciacaoBemResource;
use App\Domain\Depreciation\Services\DepreciacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepreciacaoBemController extends Controller
{
    public function __construct(private readonly DepreciacaoService $depreciacaoService)
    {
    }

    public function index(Request $request)
    {
        $query = DepreciacaoBem::query()->orderByDesc('data_calculo')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        if ($request->filled('metodo_depreciacao_id')) {
            $query->where('metodo_depreciacao_id', $request->integer('metodo_depreciacao_id'));
        }

        return DepreciacaoBemResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreDepreciacaoBemRequest $request): DepreciacaoBemResource
    {
        $depreciacao = $this->depreciacaoService->registrarDepreciacao($request->validated());

        return new DepreciacaoBemResource($depreciacao);
    }

    public function show(DepreciacaoBem $depreciacao): DepreciacaoBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($depreciacao);

        return new DepreciacaoBemResource($depreciacao);
    }

    public function update(UpdateDepreciacaoBemRequest $request, DepreciacaoBem $depreciacao): DepreciacaoBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($depreciacao);
        $depreciacao = $this->depreciacaoService->atualizarDepreciacao($depreciacao, $request->validated());

        return new DepreciacaoBemResource($depreciacao);
    }

    public function destroy(DepreciacaoBem $depreciacao): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($depreciacao);
        $depreciacao->delete();

        return response()->json(['message' => 'Depreciacao removida com sucesso.']);
    }
}
