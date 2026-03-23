<?php

namespace App\Domain\AssetRegistry\Controllers;

use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Requests\StoreBemPatrimonialRequest;
use App\Domain\AssetRegistry\Requests\UpdateBemPatrimonialRequest;
use App\Domain\AssetRegistry\Resources\BemPatrimonialResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BemPatrimonialController extends Controller
{
    public function __construct(private readonly LogOperacaoPatrimonialService $logOperacaoPatrimonialService)
    {
    }

    public function index(Request $request)
    {
        $query = BemPatrimonial::query()
            ->with(['imagens', 'documentos'])
            ->orderBy('numero_tombo');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('local_id')) {
            $query->where('local_id', $request->integer('local_id'));
        }

        return BemPatrimonialResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreBemPatrimonialRequest $request): BemPatrimonialResource
    {
        $bem = BemPatrimonial::query()->create([
            ...$request->validated(),
            'valor_aquisicao' => $request->validated()['valor_aquisicao'] ?? 0,
            'valor_residual' => $request->validated()['valor_residual'] ?? 0,
            'status_bem' => $request->validated()['status_bem'] ?? 'ativo',
            'estado_conservacao' => $request->validated()['estado_conservacao'] ?? 'bom',
        ]);

        $this->logOperacaoPatrimonialService->registrar(
            'CADASTRO_BEM',
            $bem,
            $bem->empresa_id,
            [],
            $bem->toArray(),
        );

        return new BemPatrimonialResource($bem->load(['imagens', 'documentos']));
    }

    public function show(BemPatrimonial $bem): BemPatrimonialResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        return new BemPatrimonialResource($bem->load(['imagens', 'documentos']));
    }

    public function update(UpdateBemPatrimonialRequest $request, BemPatrimonial $bem): BemPatrimonialResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);
        $bem->update($request->validated());

        return new BemPatrimonialResource($bem->fresh()->load(['imagens', 'documentos']));
    }

    public function destroy(BemPatrimonial $bem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);
        $bem->delete();

        return response()->json(['message' => 'Bem patrimonial removido com sucesso.']);
    }
}
