<?php

namespace Database\Seeders;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use Illuminate\Database\Seeder;

class NwbAssetAuthSeeder extends Seeder
{
    public function run(): void
    {
        $map = [
            RoleEnum::SUPER_ADMIN->value => [
                'empresas.visualizar',
                'empresas.criar',
                'empresas.atualizar',
                'empresas.excluir',
                'filiais.visualizar',
                'filiais.criar',
                'filiais.atualizar',
                'filiais.excluir',
                'bens.visualizar',
                'bens.criar',
                'bens.atualizar',
                'bens.excluir',
                'movimentacoes.visualizar',
                'movimentacoes.criar',
                'movimentacoes.atualizar',
                'movimentacoes.excluir',
                'inventarios.visualizar',
                'inventarios.criar',
                'inventarios.atualizar',
                'inventarios.excluir',
                'depreciacoes.visualizar',
                'depreciacoes.criar',
                'depreciacoes.atualizar',
                'depreciacoes.excluir',
                'relatorios.visualizar',
                'dashboard.visualizar',
                'usuarios.visualizar',
                'usuarios.criar',
                'usuarios.atualizar',
                'usuarios.excluir',
                'permissoes.visualizar',
            ],
            RoleEnum::ADMIN_EMPRESA->value => [
                'empresas.visualizar',
                'empresas.criar',
                'empresas.atualizar',
                'filiais.visualizar',
                'filiais.criar',
                'filiais.atualizar',
                'filiais.excluir',
                'bens.visualizar',
                'bens.criar',
                'bens.atualizar',
                'bens.excluir',
                'movimentacoes.visualizar',
                'movimentacoes.criar',
                'movimentacoes.atualizar',
                'inventarios.visualizar',
                'inventarios.criar',
                'inventarios.atualizar',
                'depreciacoes.visualizar',
                'depreciacoes.criar',
                'relatorios.visualizar',
                'dashboard.visualizar',
                'usuarios.visualizar',
                'usuarios.criar',
                'usuarios.atualizar',
                'permissoes.visualizar',
            ],
            RoleEnum::GESTOR_PATRIMONIAL->value => [
                'filiais.visualizar',
                'bens.visualizar',
                'bens.criar',
                'bens.atualizar',
                'movimentacoes.visualizar',
                'movimentacoes.criar',
                'inventarios.visualizar',
                'inventarios.criar',
                'inventarios.atualizar',
                'depreciacoes.visualizar',
                'depreciacoes.criar',
                'relatorios.visualizar',
                'dashboard.visualizar',
            ],
            RoleEnum::AUDITOR->value => [
                'bens.visualizar',
                'movimentacoes.visualizar',
                'inventarios.visualizar',
                'depreciacoes.visualizar',
                'relatorios.visualizar',
                'dashboard.visualizar',
                'permissoes.visualizar',
            ],
            RoleEnum::OPERADOR_INVENTARIO->value => [
                'inventarios.visualizar',
                'inventarios.atualizar',
                'dashboard.visualizar',
            ],
        ];

        foreach ($map as $role => $permissoes) {
            foreach ($permissoes as $permissao) {
                RolePermissao::query()->updateOrCreate([
                    'role' => $role,
                    'permissao' => $permissao,
                ]);
            }
        }
    }
}
