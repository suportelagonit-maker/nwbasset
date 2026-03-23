<?php

namespace App\Domain\Organization\Policies;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Filial;
use App\Domain\Shared\Policies\BasePolicy;

class FilialPolicy extends BasePolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'filiais.visualizar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function view(Usuario $usuario, Filial $filial): bool
    {
        return $this->sameEmpresa($filial->empresa_id) && $this->hasPermission($usuario, 'filiais.visualizar', $filial->empresa_id);
    }

    public function create(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'filiais.criar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function update(Usuario $usuario, Filial $filial): bool
    {
        return $this->sameEmpresa($filial->empresa_id) && $this->hasPermission($usuario, 'filiais.atualizar', $filial->empresa_id);
    }

    public function delete(Usuario $usuario, Filial $filial): bool
    {
        return $this->sameEmpresa($filial->empresa_id) && $this->hasPermission($usuario, 'filiais.excluir', $filial->empresa_id);
    }
}
