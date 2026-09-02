<?php

namespace App\Domain\AssetMovements\Controllers;

use App\Domain\AssetMovements\Models\BaixaBem;
use App\Domain\AssetMovements\Requests\StoreBaixaBemRequest;
use App\Domain\AssetMovements\Requests\UpdateBaixaBemRequest;
use App\Domain\AssetMovements\Resources\BaixaBemResource;
use App\Domain\AssetMovements\Services\BemMovimentacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BaixaBemController extends Controller
{
    public function __construct(private readonly BemMovimentacaoService $bemMovimentacaoService)
    {
    }

    public function index(Request $request)
    {
        $query = BaixaBem::query()->orderByDesc('data_baixa')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        return BaixaBemResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreBaixaBemRequest $request): BaixaBemResource
    {
        $baixa = $this->bemMovimentacaoService->registrarBaixa($request->validated());

        return new BaixaBemResource($baixa);
    }

    public function show(BaixaBem $baixaBem): BaixaBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($baixaBem);

        return new BaixaBemResource($baixaBem);
    }

    public function update(UpdateBaixaBemRequest $request, BaixaBem $baixaBem): BaixaBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($baixaBem);
        $baixa = $this->bemMovimentacaoService->atualizarBaixa($baixaBem, $request->validated());

        return new BaixaBemResource($baixa);
    }

    public function destroy(BaixaBem $baixaBem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($baixaBem);
        $this->bemMovimentacaoService->removerBaixa($baixaBem);

        return response()->json(['message' => 'Baixa removida com sucesso.']);
    }
}
