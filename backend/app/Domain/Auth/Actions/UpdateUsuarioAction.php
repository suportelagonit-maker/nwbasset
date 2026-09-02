<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\DTOs\UsuarioData;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Auth\Models\UsuarioPermissao;
use Illuminate\Support\Facades\DB;

class UpdateUsuarioAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(Usuario $usuario, UsuarioData $data, int $empresaId, Usuario $actor): Usuario
    {
        return DB::transaction(function () use ($usuario, $data, $empresaId, $actor): Usuario {
            $dadosAnteriores = $usuario->load(['empresa', 'empresas', 'permissoesDiretas'])->toArray();
            $attributes = $data->attributes;
            $permissoes = $this->resolvePermissoes($attributes['permissoes'] ?? null, $attributes['role'] ?? $usuario->role);
            unset($attributes['permissoes']);

            if (($attributes['password'] ?? null) === null) {
                unset($attributes['password']);
            }

            $attributes['empresa_id'] = $empresaId;
            $usuario->fill($attributes)->save();
            $usuario->empresas()->syncWithoutDetaching([
                $empresaId => [
                    'perfil' => $usuario->role,
                    'created_at' => $usuario->empresas()->where('empresas.id', $empresaId)->first()?->pivot?->created_at ?? now(),
                ],
            ]);
            $this->syncPermissoesDiretas($usuario, $empresaId, $permissoes);

            $this->auditLogger->log(
                usuario: $actor,
                evento: AuditoriaEventoEnum::ATUALIZACAO->value,
                entidade: $usuario,
                empresaId: $empresaId,
                dadosAnteriores: $dadosAnteriores,
                dadosNovos: $usuario->fresh()->load(['empresa', 'empresas', 'permissoesDiretas'])->toArray(),
                descricao: 'Usuário atualizado.',
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

        if (! is_string($role) || $role === '') {
            return [];
        }

        return RolePermissao::query()
            ->where('role', $role)
            ->orderBy('permissao')
            ->pluck('permissao')
            ->all();
    }
}
