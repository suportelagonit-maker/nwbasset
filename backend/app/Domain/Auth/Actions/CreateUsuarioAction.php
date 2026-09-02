<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\DTOs\UsuarioData;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Auth\Models\UsuarioPermissao;
use Illuminate\Support\Facades\DB;

class CreateUsuarioAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(UsuarioData $data, int $empresaId, Usuario $actor): Usuario
    {
        return DB::transaction(function () use ($data, $empresaId, $actor): Usuario {
            $attributes = $data->attributes;
            $permissoes = $this->resolvePermissoes($attributes['permissoes'] ?? null, $attributes['role'] ?? null);
            unset($attributes['permissoes']);

            $usuario = Usuario::query()->create([
                ...$attributes,
                'empresa_id' => $empresaId,
                'role' => $attributes['role'] ?? RoleEnum::OPERADOR_INVENTARIO->value,
                'ativo' => $attributes['ativo'] ?? true,
            ]);

            $usuario->empresas()->syncWithoutDetaching([
                $empresaId => [
                    'perfil' => $usuario->role,
                    'created_at' => now(),
                ],
            ]);

            $this->syncPermissoesDiretas($usuario, $empresaId, $permissoes);

            $this->auditLogger->log(
                usuario: $actor,
                evento: AuditoriaEventoEnum::CRIACAO->value,
                entidade: $usuario,
                empresaId: $empresaId,
                dadosNovos: $usuario->fresh()->load(['empresa', 'empresas', 'permissoesDiretas'])->toArray(),
                descricao: 'Usuário cadastrado.',
            );

            return $usuario->load(['empresa', 'empresas', 'permissoesDiretas']);
        });
    }

    private function syncPermissoesDiretas(Usuario $usuario, int $empresaId, array $permissoes): void
    {
        UsuarioPermissao::query()
            ->where('usuario_id', $usuario->id)
            ->where('empresa_id', $empresaId)
            ->delete();

        if ($permissoes === []) {
            return;
        }

        UsuarioPermissao::query()->insert(
            collect($permissoes)
                ->map(fn (string $permissao) => [
                    'usuario_id' => $usuario->id,
                    'empresa_id' => $empresaId,
                    'permissao' => $permissao,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->all(),
        );
    }

    private function resolvePermissoes(mixed $permissoes, ?string $role): array
    {
        $lista = collect(is_array($permissoes) ? $permissoes : [])
            ->filter(fn ($item) => is_string($item) && $item !== '')
            ->unique()
            ->values()
            ->all();

        if ($lista !== []) {
            return $lista;
        }

        $role ??= RoleEnum::OPERADOR_INVENTARIO->value;

        return RolePermissao::query()
            ->where('role', $role)
            ->orderBy('permissao')
            ->pluck('permissao')
            ->all();
    }
}
