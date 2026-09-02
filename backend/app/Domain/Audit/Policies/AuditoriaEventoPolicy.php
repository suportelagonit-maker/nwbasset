<?php

namespace App\Domain\Audit\Policies;

use App\Domain\Audit\Models\AuditoriaEvento;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Shared\Policies\BasePolicy;

class AuditoriaEventoPolicy extends BasePolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'auditoria.visualizar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function view(Usuario $usuario, AuditoriaEvento $auditoriaEvento): bool
    {
        return $this->sameEmpresa($auditoriaEvento->empresa_id) && $this->hasPermission($usuario, 'auditoria.visualizar', $auditoriaEvento->empresa_id);
    }
}
