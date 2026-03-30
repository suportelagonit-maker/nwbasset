<?php

namespace App\Domain\Auth\Controllers;

use App\Domain\Auth\Actions\CreateUsuarioAction;
use App\Domain\Auth\Actions\UpdateUsuarioAction;
use App\Domain\Auth\DTOs\UsuarioData;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Auth\Queries\UsuarioIndexQuery;
use App\Domain\Auth\Requests\StoreUsuarioRequest;
use App\Domain\Auth\Requests\UpdateUsuarioRequest;
use App\Domain\Auth\Resources\UsuarioResource;
use App\Domain\Administration\Services\PermissionCatalogService;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Http\Controllers\Controller;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UsuarioController extends Controller
{
    public function index(Request $request, UsuarioIndexQuery $query): AnonymousResourceCollection
    {
        return UsuarioResource::collection(
            $query->handle((int) $request->attributes->get('empresa_id'))->paginate($request->integer('per_page', 15)),
        );
    }

    public function catalogoPermissoes(Request $request, PermissionCatalogService $catalog): JsonResponse
    {
        $usuario = $request->user();
        $allowedRoles = $usuario && method_exists($usuario, 'isSuperAdmin') && $usuario->isSuperAdmin()
            ? RoleEnum::values()
            : [
                RoleEnum::GESTOR_PATRIMONIAL->value,
                RoleEnum::AUDITOR->value,
                RoleEnum::OPERADOR_INVENTARIO->value,
            ];

        $allowedPermissionPrefixes = $usuario && method_exists($usuario, 'isSuperAdmin') && $usuario->isSuperAdmin()
            ? null
            : ['filiais.', 'bens.', 'movimentacoes.', 'inventarios.', 'depreciacoes.', 'relatorios.', 'dashboard.'];

        $permissoes = collect($catalog->definitions())
            ->filter(function (array $item) use ($allowedPermissionPrefixes): bool {
                if ($allowedPermissionPrefixes === null) {
                    return true;
                }

                return collect($allowedPermissionPrefixes)
                    ->contains(fn (string $prefix) => str_starts_with($item['codigo'], $prefix));
            })
            ->groupBy('grupo')
            ->map(fn ($items, $grupo) => [
                'grupo' => $grupo,
                'itens' => collect($items)->map(fn (array $item) => [
                    'codigo' => $item['codigo'],
                    'nome' => $item['nome'],
                    'descricao' => $item['descricao'],
                ])->values(),
            ])
            ->values();

        $rolePermissoes = RolePermissao::query()
            ->whereIn('role', $allowedRoles)
            ->orderBy('role')
            ->orderBy('permissao')
            ->get()
            ->filter(function (RolePermissao $item) use ($allowedPermissionPrefixes): bool {
                if ($allowedPermissionPrefixes === null) {
                    return true;
                }

                return collect($allowedPermissionPrefixes)
                    ->contains(fn (string $prefix) => str_starts_with($item->permissao, $prefix));
            })
            ->groupBy('role')
            ->map(fn ($items) => $items->pluck('permissao')->values())
            ->all();

        return response()->json([
            'data' => [
                'roles' => $allowedRoles,
                'grupos' => $permissoes,
                'role_permissoes' => $rolePermissoes,
            ],
        ]);
    }

    public function store(StoreUsuarioRequest $request, CreateUsuarioAction $action): UsuarioResource
    {
        return new UsuarioResource(
            $action->execute(
                UsuarioData::fromArray($request->validated()),
                (int) $request->attributes->get('empresa_id'),
                $request->user(),
            ),
        );
    }

    public function show(Usuario $usuario, Request $request): UsuarioResource
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($usuario, 'empresa', null, 'id');

        return new UsuarioResource(
            $usuario->load([
                'empresa',
                'empresas' => fn ($relation) => $relation->where('empresas.id', (int) $request->attributes->get('empresa_id')),
                'permissoesDiretas' => fn ($relation) => $relation->where('empresa_id', (int) $request->attributes->get('empresa_id')),
            ]),
        );
    }

    public function update(UpdateUsuarioRequest $request, Usuario $usuario, UpdateUsuarioAction $action): UsuarioResource
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($usuario, 'empresa', null, 'id');
        $this->assertUsuarioGerenciavel($usuario, $request->user());

        return new UsuarioResource(
            $action->execute(
                $usuario,
                UsuarioData::fromArray($request->validated()),
                (int) $request->attributes->get('empresa_id'),
                $request->user(),
            ),
        );
    }

    public function destroy(Usuario $usuario, Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $this->empresaContext()->garantirModelRelacionadoDaEmpresa($usuario, 'empresa', null, 'id');
        $this->assertUsuarioGerenciavel($usuario, $request->user());

        $dadosAnteriores = $usuario->toArray();
        $usuario->update(['ativo' => false]);

        $auditLogger->log(
            usuario: $request->user(),
            evento: AuditoriaEventoEnum::EXCLUSAO->value,
            entidade: $usuario,
            empresaId: $usuario->empresa_id,
            dadosAnteriores: $dadosAnteriores,
            dadosNovos: $usuario->fresh()->toArray(),
            descricao: 'Usuario inativado.',
        );

        return response()->json(['message' => 'Usuário inativado com sucesso.']);
    }

    private function assertUsuarioGerenciavel(Usuario $usuarioAlvo, mixed $actor): void
    {
        if ($usuarioAlvo->canBeManagedBy($actor instanceof Usuario ? $actor : null)) {
            return;
        }

        throw new AuthorizationException('O usuário admin@nwbasset.local é protegido e só pode ser alterado por ele mesmo.');
    }
}
