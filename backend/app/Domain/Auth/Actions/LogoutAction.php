<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;

class LogoutAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(Usuario $usuario): void
    {
        $empresaId = $usuario->empresaPadrao()?->id ?? $usuario->empresa_id;

        $this->auditLogger->log(
            usuario: $usuario,
            evento: AuditoriaEventoEnum::LOGOUT->value,
            entidade: 'auth.logout',
            empresaId: $empresaId,
            descricao: 'Logout realizado com sucesso.',
        );

        $usuario->currentAccessToken()?->delete();
    }
}
