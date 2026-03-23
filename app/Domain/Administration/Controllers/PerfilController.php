<?php

namespace App\Domain\Administration\Controllers;

use App\Domain\Administration\Actions\CreatePerfilAction;
use App\Domain\Administration\Actions\UpdatePerfilAction;
use App\Domain\Administration\DTOs\PerfilData;
use App\Domain\Administration\Models\Perfil;
use App\Domain\Administration\Queries\PerfilIndexQuery;
use App\Domain\Administration\Requests\StorePerfilRequest;
use App\Domain\Administration\Requests\UpdatePerfilRequest;
use App\Domain\Administration\Resources\PerfilResource;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerfilController extends Controller
{
    public function index(Request $request, PerfilIndexQuery $query)
    {
        $this->authorize('viewAny', Perfil::class);

        return PerfilResource::collection(
            $query->handle((int) $request->attributes->get('empresa_id'))->paginate($request->integer('per_page', 15)),
        );
    }

    public function store(StorePerfilRequest $request, CreatePerfilAction $action): PerfilResource
    {
        $this->authorize('create', Perfil::class);

        return new PerfilResource(
            $action->execute(
                PerfilData::fromArray($request->validated()),
                (int) $request->attributes->get('empresa_id'),
                $request->user(),
            ),
        );
    }

    public function show(Perfil $perfil): PerfilResource
    {
        $this->authorize('view', $perfil);

        return new PerfilResource($perfil->load(['empresa', 'permissoes']));
    }

    public function update(UpdatePerfilRequest $request, Perfil $perfil, UpdatePerfilAction $action): PerfilResource
    {
        $this->authorize('update', $perfil);

        return new PerfilResource(
            $action->execute($perfil, PerfilData::fromArray($request->validated()), $request->user()),
        );
    }

    public function destroy(Perfil $perfil, Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $this->authorize('delete', $perfil);

        $dadosAnteriores = $perfil->toArray();
        $perfil->delete();

        $auditLogger->log(
            usuario: $request->user(),
            evento: AuditoriaEventoEnum::EXCLUSAO->value,
            entidade: $perfil,
            empresaId: $perfil->empresa_id,
            dadosAnteriores: $dadosAnteriores,
            descricao: 'Perfil inativado.',
        );

        return response()->json(['message' => 'Perfil inativado com sucesso.']);
    }
}
