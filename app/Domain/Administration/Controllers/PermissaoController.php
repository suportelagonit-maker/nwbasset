<?php

namespace App\Domain\Administration\Controllers;

use App\Domain\Administration\Actions\CreatePermissaoAction;
use App\Domain\Administration\Actions\UpdatePermissaoAction;
use App\Domain\Administration\DTOs\PermissaoData;
use App\Domain\Administration\Models\Permissao;
use App\Domain\Administration\Queries\PermissaoIndexQuery;
use App\Domain\Administration\Requests\StorePermissaoRequest;
use App\Domain\Administration\Requests\UpdatePermissaoRequest;
use App\Domain\Administration\Resources\PermissaoResource;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissaoController extends Controller
{
    public function index(Request $request, PermissaoIndexQuery $query)
    {
        $this->authorize('viewAny', Permissao::class);

        return PermissaoResource::collection(
            $query->handle((int) $request->attributes->get('empresa_id'))->paginate($request->integer('per_page', 15)),
        );
    }

    public function store(StorePermissaoRequest $request, CreatePermissaoAction $action): PermissaoResource
    {
        $this->authorize('create', Permissao::class);

        return new PermissaoResource(
            $action->execute(
                PermissaoData::fromArray($request->validated()),
                (int) $request->attributes->get('empresa_id'),
                $request->user(),
            ),
        );
    }

    public function show(Permissao $permissao): PermissaoResource
    {
        $this->authorize('view', $permissao);

        return new PermissaoResource($permissao);
    }

    public function update(UpdatePermissaoRequest $request, Permissao $permissao, UpdatePermissaoAction $action): PermissaoResource
    {
        $this->authorize('update', $permissao);

        return new PermissaoResource(
            $action->execute($permissao, PermissaoData::fromArray($request->validated()), $request->user()),
        );
    }

    public function destroy(Permissao $permissao, Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $this->authorize('delete', $permissao);

        $dadosAnteriores = $permissao->toArray();
        $permissao->delete();

        $auditLogger->log(
            usuario: $request->user(),
            evento: AuditoriaEventoEnum::EXCLUSAO->value,
            entidade: $permissao,
            empresaId: $permissao->empresa_id,
            dadosAnteriores: $dadosAnteriores,
            descricao: 'Permissão inativada.',
        );

        return response()->json(['message' => 'Permissão inativada com sucesso.']);
    }
}
