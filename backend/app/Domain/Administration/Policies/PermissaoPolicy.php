<?php

namespace App\Domain\Administration\Policies;

use App\Domain\Administration\Models\Permissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Shared\Policies\BasePolicy;

class PermissaoPolicy extends BasePolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'permissoes.visualizar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function view(Usuario $usuario, Permissao $permissao): bool
    {
        return $this->sameEmpresa($permissao->empresa_id) && $this->hasPermission($usuario, 'permissoes.visualizar', $permissao->empresa_id);
    }

    public function create(Usuario $usuario): bool
    {
        return $this->hasPermission($usuario, 'permissoes.criar', app(\App\Domain\MultiCompany\Services\EmpresaContext::class)->id());
    }

    public function update(Usuario $usuario, Permissao $permissao): bool
    {
        return $this->sameEmpresa($permissao->empresa_id) && $this->hasPermission($usuario, 'permissoes.atualizar', $permissao->empresa_id);
    }

    public function delete(Usuario $usuario, Permissao $permissao): bool
    {
        return $this->sameEmpresa($permissao->empresa_id) && $this->hasPermission($usuario, 'permissoes.excluir', $permissao->empresa_id);
    }
}
