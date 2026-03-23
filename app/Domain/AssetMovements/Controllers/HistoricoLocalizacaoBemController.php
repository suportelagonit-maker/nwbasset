<?php

namespace App\Domain\AssetMovements\Controllers;

use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Requests\StoreHistoricoLocalizacaoBemRequest;
use App\Domain\AssetMovements\Requests\UpdateHistoricoLocalizacaoBemRequest;
use App\Domain\AssetMovements\Resources\HistoricoLocalizacaoBemResource;
use App\Domain\AssetMovements\Services\BemMovimentacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoricoLocalizacaoBemController extends Controller
{
    public function __construct(private readonly BemMovimentacaoService $bemMovimentacaoService)
    {
    }

    public function index(Request $request)
    {
        $query = HistoricoLocalizacaoBem::query()->orderByDesc('data_inicio')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        if ($request->filled('local_id')) {
            $query->where('local_id', $request->integer('local_id'));
        }

        return HistoricoLocalizacaoBemResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreHistoricoLocalizacaoBemRequest $request): HistoricoLocalizacaoBemResource
    {
        $historico = $this->bemMovimentacaoService->registrarHistoricoLocalizacao($request->validated());

        return new HistoricoLocalizacaoBemResource($historico);
    }

    public function show(HistoricoLocalizacaoBem $historicoLocalizacaoBem): HistoricoLocalizacaoBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($historicoLocalizacaoBem);

        return new HistoricoLocalizacaoBemResource($historicoLocalizacaoBem);
    }

    public function update(
        UpdateHistoricoLocalizacaoBemRequest $request,
        HistoricoLocalizacaoBem $historicoLocalizacaoBem
    ): HistoricoLocalizacaoBemResource {
        $this->empresaContext()->garantirModelDaEmpresa($historicoLocalizacaoBem);
        $historico = $this->bemMovimentacaoService->atualizarHistoricoLocalizacao(
            $historicoLocalizacaoBem,
            $request->validated(),
        );

        return new HistoricoLocalizacaoBemResource($historico);
    }

    public function destroy(HistoricoLocalizacaoBem $historicoLocalizacaoBem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($historicoLocalizacaoBem);
        $this->bemMovimentacaoService->removerHistoricoLocalizacao($historicoLocalizacaoBem);

        return response()->json(['message' => 'Historico de localizacao removido com sucesso.']);
    }
}
