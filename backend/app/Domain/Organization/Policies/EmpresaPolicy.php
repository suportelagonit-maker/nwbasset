<?php

namespace App\Domain\Organization\Policies;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Shared\Policies\BasePolicy;

class EmpresaPolicy extends BasePolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'empresas.visualizar');
    }

    public function view(Usuario $usuario, Empresa $empresa): bool
    {
        return $usuario->pertenceAEmpresa($empresa->id) && $this->hasPermission($usuario, 'empresas.visualizar', $empresa->id);
    }

    public function create(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'empresas.criar');
    }

    public function update(Usuario $usuario, Empresa $empresa): bool
    {
        return $usuario->pertenceAEmpresa($empresa->id) && $this->hasPermission($usuario, 'empresas.atualizar', $empresa->id);
    }

    public function delete(Usuario $usuario, Empresa $empresa): bool
    {
        return $usuario->pertenceAEmpresa($empresa->id) && $this->hasPermission($usuario, 'empresas.excluir', $empresa->id);
    }
}
