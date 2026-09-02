<?php

namespace App\Domain\Shared\Policies;

use App\Domain\Auth\Models\Usuario;

abstract class BasePolicy
{
    protected function hasPermission(Usuario $usuario, string $permission, ?int $empresaId = null): bool
    {
        return $usuario->temAlgumaPermissao([$permission, 'administracao.total'], $empresaId);
    }

    protected function sameEmpresa(?int $empresaId): bool
    {
        if ($empresaId === null) {
            return false;
        }

        return app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id() === $empresaId;
    }
}
