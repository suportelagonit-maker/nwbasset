<?php

namespace App\Domain\Auth\Policies;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Shared\Policies\BasePolicy;

class UsuarioPolicy extends BasePolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'usuarios.visualizar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function view(Usuario $usuario, Usuario $model): bool
    {
        return $this->sameEmpresa($model->empresa_id) && $this->hasPermission($usuario, 'usuarios.visualizar', $model->empresa_id);
    }

    public function create(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'usuarios.criar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function update(Usuario $usuario, Usuario $model): bool
    {
        return $this->sameEmpresa($model->empresa_id) && $this->hasPermission($usuario, 'usuarios.atualizar', $model->empresa_id);
    }

    public function delete(Usuario $usuario, Usuario $model): bool
    {
        return $this->sameEmpresa($model->empresa_id) && $this->hasPermission($usuario, 'usuarios.excluir', $model->empresa_id);
    }
}
