<?php

namespace App\Domain\Administration\Services;

use App\Domain\Administration\Models\Permissao;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Collection;

class PermissionCatalogService
{
    public function definitions(): array
    {
        return [
            ['grupo' => 'Empresas', 'codigo' => 'empresas.visualizar', 'nome' => 'Visualizar empresas', 'descricao' => 'Permite consultar empresas.'],
            ['grupo' => 'Empresas', 'codigo' => 'empresas.criar', 'nome' => 'Criar empresas', 'descricao' => 'Permite cadastrar empresas.'],
            ['grupo' => 'Empresas', 'codigo' => 'empresas.atualizar', 'nome' => 'Atualizar empresas', 'descricao' => 'Permite atualizar empresas.'],
            ['grupo' => 'Empresas', 'codigo' => 'empresas.excluir', 'nome' => 'Excluir empresas', 'descricao' => 'Permite inativar empresas.'],
            ['grupo' => 'Filiais', 'codigo' => 'filiais.visualizar', 'nome' => 'Visualizar filiais', 'descricao' => 'Permite consultar filiais.'],
            ['grupo' => 'Filiais', 'codigo' => 'filiais.criar', 'nome' => 'Criar filiais', 'descricao' => 'Permite cadastrar filiais.'],
            ['grupo' => 'Filiais', 'codigo' => 'filiais.atualizar', 'nome' => 'Atualizar filiais', 'descricao' => 'Permite atualizar filiais.'],
            ['grupo' => 'Filiais', 'codigo' => 'filiais.excluir', 'nome' => 'Excluir filiais', 'descricao' => 'Permite inativar filiais.'],
            ['grupo' => 'Usuarios', 'codigo' => 'usuarios.visualizar', 'nome' => 'Visualizar usuários', 'descricao' => 'Permite consultar usuários.'],
            ['grupo' => 'Usuarios', 'codigo' => 'usuarios.criar', 'nome' => 'Criar usuários', 'descricao' => 'Permite cadastrar usuários.'],
            ['grupo' => 'Usuarios', 'codigo' => 'usuarios.atualizar', 'nome' => 'Atualizar usuários', 'descricao' => 'Permite atualizar usuários.'],
            ['grupo' => 'Usuarios', 'codigo' => 'usuarios.excluir', 'nome' => 'Excluir usuários', 'descricao' => 'Permite inativar usuários.'],
            ['grupo' => 'Perfis', 'codigo' => 'perfis.visualizar', 'nome' => 'Visualizar perfis', 'descricao' => 'Permite consultar perfis.'],
            ['grupo' => 'Perfis', 'codigo' => 'perfis.criar', 'nome' => 'Criar perfis', 'descricao' => 'Permite cadastrar perfis.'],
            ['grupo' => 'Perfis', 'codigo' => 'perfis.atualizar', 'nome' => 'Atualizar perfis', 'descricao' => 'Permite atualizar perfis.'],
            ['grupo' => 'Perfis', 'codigo' => 'perfis.excluir', 'nome' => 'Excluir perfis', 'descricao' => 'Permite inativar perfis.'],
            ['grupo' => 'Permissoes', 'codigo' => 'permissoes.visualizar', 'nome' => 'Visualizar permissões', 'descricao' => 'Permite consultar permissões.'],
            ['grupo' => 'Permissoes', 'codigo' => 'permissoes.criar', 'nome' => 'Criar permissões', 'descricao' => 'Permite cadastrar permissões.'],
            ['grupo' => 'Permissoes', 'codigo' => 'permissoes.atualizar', 'nome' => 'Atualizar permissões', 'descricao' => 'Permite atualizar permissões.'],
            ['grupo' => 'Permissoes', 'codigo' => 'permissoes.excluir', 'nome' => 'Excluir permissões', 'descricao' => 'Permite inativar permissões.'],
            ['grupo' => 'Auditoria', 'codigo' => 'auditoria.visualizar', 'nome' => 'Visualizar auditoria', 'descricao' => 'Permite consultar auditoria.'],
            ['grupo' => 'Administracao', 'codigo' => 'administracao.total', 'nome' => 'Administração total', 'descricao' => 'Permite administrar todos os cadastros da empresa.'],
        ];
    }

    public function createForEmpresa(Empresa $empresa): Collection
    {
        return collect($this->definitions())->map(function (array $item): Permissao {
            return Permissao::query()->updateOrCreate(
                [
                    'chave' => $item['codigo'],
                ],
                [
                    'nome' => $item['nome'],
                ],
            );
        });
    }
}
