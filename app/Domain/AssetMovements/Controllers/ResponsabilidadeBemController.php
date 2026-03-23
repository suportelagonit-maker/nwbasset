<?php

namespace App\Domain\AssetMovements\Controllers;

use App\Domain\AssetMovements\Models\ResponsabilidadeBem;
use App\Domain\AssetMovements\Requests\StoreResponsabilidadeBemRequest;
use App\Domain\AssetMovements\Requests\UpdateResponsabilidadeBemRequest;
use App\Domain\AssetMovements\Resources\ResponsabilidadeBemResource;
use App\Domain\AssetMovements\Services\BemMovimentacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResponsabilidadeBemController extends Controller
{
    public function __construct(private readonly BemMovimentacaoService $bemMovimentacaoService)
    {
    }

    public function index(Request $request)
    {
        $query = ResponsabilidadeBem::query()->orderByDesc('data_inicio')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        if ($request->filled('responsavel_id')) {
            $query->where('responsavel_id', $request->integer('responsavel_id'));
        }

        return ResponsabilidadeBemResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreResponsabilidadeBemRequest $request): ResponsabilidadeBemResource
    {
        $responsabilidade = $this->bemMovimentacaoService->registrarResponsabilidade($request->validated());

        return new ResponsabilidadeBemResource($responsabilidade);
    }

    public function show(ResponsabilidadeBem $responsabilidadeBem): ResponsabilidadeBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($responsabilidadeBem);

        return new ResponsabilidadeBemResource($responsabilidadeBem);
    }

    public function update(
        UpdateResponsabilidadeBemRequest $request,
        ResponsabilidadeBem $responsabilidadeBem
    ): ResponsabilidadeBemResource {
        $this->empresaContext()->garantirModelDaEmpresa($responsabilidadeBem);
        $responsabilidade = $this->bemMovimentacaoService->atualizarResponsabilidade(
            $responsabilidadeBem,
            $request->validated(),
        );

        return new ResponsabilidadeBemResource($responsabilidade);
    }

    public function destroy(ResponsabilidadeBem $responsabilidadeBem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($responsabilidadeBem);
        $this->bemMovimentacaoService->removerResponsabilidade($responsabilidadeBem);

        return response()->json(['message' => 'Responsabilidade removida com sucesso.']);
    }
}
