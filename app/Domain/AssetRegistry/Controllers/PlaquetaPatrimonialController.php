<?php

namespace App\Domain\AssetRegistry\Controllers;

use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use App\Domain\AssetRegistry\Requests\ImportPlaquetasPatrimoniaisRequest;
use App\Domain\AssetRegistry\Requests\StorePlaquetaEstoqueRequest;
use App\Domain\AssetRegistry\Requests\StorePlaquetaPatrimonialRequest;
use App\Domain\AssetRegistry\Requests\UpdatePlaquetaPatrimonialRequest;
use App\Domain\AssetRegistry\Requests\VincularPlaquetaPatrimonialRequest;
use App\Domain\AssetRegistry\Resources\PlaquetaPatrimonialResource;
use App\Domain\AssetRegistry\Services\PlaquetaImportacaoService;
use App\Domain\AssetRegistry\Services\PlaquetaPatrimonialService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlaquetaPatrimonialController extends Controller
{
    public function __construct(
        private readonly PlaquetaPatrimonialService $plaquetaPatrimonialService,
        private readonly PlaquetaImportacaoService $plaquetaImportacaoService,
    ) {
    }

    public function index(Request $request)
    {
        $query = PlaquetaPatrimonial::query()
            ->with(['bemPatrimonial', 'filial'])
            ->orderByDesc('created_at')
            ->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('bem_patrimonial_id')) {
            $query->where('bem_patrimonial_id', $request->integer('bem_patrimonial_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('disponivel_para_vinculo')) {
            $query->whereNull('bem_patrimonial_id');
        }

        return PlaquetaPatrimonialResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StorePlaquetaPatrimonialRequest $request): PlaquetaPatrimonialResource
    {
        $plaqueta = $this->plaquetaPatrimonialService->criarPlaquetaParaBem($request->validated());

        return new PlaquetaPatrimonialResource($plaqueta);
    }

    public function show(PlaquetaPatrimonial $plaqueta): PlaquetaPatrimonialResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($plaqueta);

        return new PlaquetaPatrimonialResource($plaqueta);
    }

    public function update(
        UpdatePlaquetaPatrimonialRequest $request,
        PlaquetaPatrimonial $plaqueta
    ): PlaquetaPatrimonialResource {
        $this->empresaContext()->garantirModelDaEmpresa($plaqueta);
        $plaqueta = $this->plaquetaPatrimonialService->atualizarPlaqueta($plaqueta, $request->validated());

        return new PlaquetaPatrimonialResource($plaqueta);
    }

    public function destroy(PlaquetaPatrimonial $plaqueta): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($plaqueta);
        $plaqueta->delete();

        return response()->json(['message' => 'Plaqueta patrimonial removida com sucesso.']);
    }

    public function storeEstoque(StorePlaquetaEstoqueRequest $request): PlaquetaPatrimonialResource
    {
        $plaqueta = $this->plaquetaPatrimonialService->criarOuAtualizarPlaquetaEmEstoque($request->validated());

        return new PlaquetaPatrimonialResource($plaqueta);
    }

    public function importar(ImportPlaquetasPatrimoniaisRequest $request): JsonResponse
    {
        $resultado = $this->plaquetaImportacaoService->importar(
            $request->file('arquivo'),
            (int) $this->empresaContext()->getEmpresaAtual(),
        );

        return response()->json([
            'message' => 'Importação de plaquetas concluída com sucesso.',
            'data' => $resultado,
        ]);
    }

    public function vincular(VincularPlaquetaPatrimonialRequest $request): PlaquetaPatrimonialResource
    {
        $plaqueta = $this->plaquetaPatrimonialService->vincularPlaquetaExistente($request->validated());

        return new PlaquetaPatrimonialResource($plaqueta);
    }
}
