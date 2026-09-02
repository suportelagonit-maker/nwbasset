<?php

namespace App\Domain\Administration\Policies;

use App\Domain\Administration\Models\Perfil;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Shared\Policies\BasePolicy;

class PerfilPolicy extends BasePolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'perfis.visualizar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function view(Usuario $usuario, Perfil $perfil): bool
    {
        return $this->sameEmpresa($perfil->empresa_id) && $this->hasPermission($usuario, 'perfis.visualizar', $perfil->empresa_id);
    }

    public function create(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'perfis.criar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function update(Usuario $usuario, Perfil $perfil): bool
    {
        return $this->sameEmpresa($perfil->empresa_id) && $this->hasPermission($usuario, 'perfis.atualizar', $perfil->empresa_id);
    }

    public function delete(Usuario $usuario, Perfil $perfil): bool
    {
        return $this->sameEmpresa($perfil->empresa_id) && $this->hasPermission($usuario, 'perfis.excluir', $perfil->empresa_id);
    }
}
