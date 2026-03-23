<?php

namespace App\Domain\Organization\Controllers;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Organization\Actions\CreateFilialAction;
use App\Domain\Organization\Actions\UpdateFilialAction;
use App\Domain\Organization\DTOs\FilialData;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Queries\FilialIndexQuery;
use App\Domain\Organization\Requests\StoreFilialRequest;
use App\Domain\Organization\Requests\UpdateFilialRequest;
use App\Domain\Organization\Resources\FilialResource;
use App\Domain\Organization\Services\EmpresaMatrizSyncService;
use App\Domain\Organization\Support\FilialCodigoManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FilialController extends Controller
{
    public function index(Request $request, FilialIndexQuery $query)
    {
        $this->authorize('viewAny', Filial::class);

        return FilialResource::collection(
            $query->handle((int) $request->attributes->get('empresa_id'))->paginate($request->integer('per_page', 15)),
        );
    }

    public function store(StoreFilialRequest $request, CreateFilialAction $action): FilialResource
    {
        $this->authorize('create', Filial::class);

        return new FilialResource(
            $action->execute(
                FilialData::fromArray($request->validated()),
                (int) $request->attributes->get('empresa_id'),
                $request->user(),
            ),
        );
    }

    public function show(Filial $filial, EmpresaMatrizSyncService $syncService): FilialResource
    {
        $this->authorize('view', $filial);

        if ($filial->matriz) {
            $syncService->sync($filial->empresa);
        }

        return new FilialResource($filial->fresh()->load('empresa'));
    }

    public function update(UpdateFilialRequest $request, Filial $filial, UpdateFilialAction $action): FilialResource
    {
        $this->authorize('update', $filial);

        return new FilialResource(
            $action->execute($filial, FilialData::fromArray($request->validated()), $request->user()),
        );
    }

    public function destroy(
        Filial $filial,
        Request $request,
        AuditLogger $auditLogger,
        FilialCodigoManager $filialCodigoManager,
    ): JsonResponse
    {
        $this->authorize('delete', $filial);

        $filialSubstituta = Filial::query()
            ->where('empresa_id', $filial->empresa_id)
            ->whereKeyNot($filial->id)
            ->orderByDesc('matriz')
            ->orderBy('nome')
            ->first();

        if (! $filialSubstituta) {
            return response()->json([
                'message' => 'A empresa precisa manter ao menos uma filial matriz ativa.',
            ], 422);
        }

        if ($filial->matriz) {
            $filialSubstituta->update(['matriz' => true]);
            $filialCodigoManager->aplicar($filialSubstituta->refresh());
        }

        $dadosAnteriores = $filial->toArray();
        $filial->delete();

        $filialCodigoManager->sincronizarEmpresa($filial->empresa_id);

        $auditLogger->log(
            usuario: $request->user(),
            evento: AuditoriaEventoEnum::EXCLUSAO->value,
            entidade: $filial,
            empresaId: $filial->empresa_id,
            dadosAnteriores: $dadosAnteriores,
            descricao: 'Filial inativada.',
        );

        return response()->json(['message' => 'Filial inativada com sucesso.']);
    }
}
