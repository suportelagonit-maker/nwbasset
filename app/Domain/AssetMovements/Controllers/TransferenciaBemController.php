<?php

namespace App\Domain\AssetMovements\Controllers;

use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\AssetMovements\Requests\StoreTransferenciaBemRequest;
use App\Domain\AssetMovements\Requests\UpdateTransferenciaBemRequest;
use App\Domain\AssetMovements\Resources\TransferenciaBemResource;
use App\Domain\AssetMovements\Services\BemMovimentacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferenciaBemController extends Controller
{
    public function __construct(private readonly BemMovimentacaoService $bemMovimentacaoService)
    {
    }

    public function index(Request $request)
    {
        $query = TransferenciaBem::query()->orderByDesc('data_transferencia')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        return TransferenciaBemResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreTransferenciaBemRequest $request): TransferenciaBemResource
    {
        $transferencia = $this->bemMovimentacaoService->registrarTransferencia($request->validated());

        return new TransferenciaBemResource($transferencia);
    }

    public function show(TransferenciaBem $transferenciaBem): TransferenciaBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($transferenciaBem);

        return new TransferenciaBemResource($transferenciaBem);
    }

    public function update(
        UpdateTransferenciaBemRequest $request,
        TransferenciaBem $transferenciaBem
    ): TransferenciaBemResource {
        $this->empresaContext()->garantirModelDaEmpresa($transferenciaBem);
        $transferencia = $this->bemMovimentacaoService->atualizarTransferencia(
            $transferenciaBem,
            $request->validated(),
        );

        return new TransferenciaBemResource($transferencia);
    }

    public function destroy(TransferenciaBem $transferenciaBem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($transferenciaBem);
        $this->bemMovimentacaoService->removerTransferencia($transferenciaBem);

        return response()->json(['message' => 'Transferencia removida com sucesso.']);
    }
}
