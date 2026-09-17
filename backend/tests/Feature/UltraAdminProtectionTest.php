<?php

namespace Tests\Feature;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UltraAdminProtectionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_admin_empresa_cannot_update_or_delete_ultra_admin(): void
    {
        $empresa = $this->createEmpresa('Empresa Protegida', '12345678000111');

        $ultraAdmin = $this->createUsuario(
            empresa: $empresa,
            nome: 'Administrador NWB Asset',
            email: 'admin@nwbasset.local',
            role: RoleEnum::SUPER_ADMIN->value,
            perfilEmpresa: RoleEnum::SUPER_ADMIN->value,
        );

        $adminEmpresa = $this->createUsuario(
            empresa: $empresa,
            nome: 'Admin Empresa',
            email: 'admin.empresa@teste.local',
            role: RoleEnum::ADMIN_EMPRESA->value,
            perfilEmpresa: RoleEnum::ADMIN_EMPRESA->value,
        );

        $this->grantPermissions(RoleEnum::ADMIN_EMPRESA->value, [
            'usuarios.visualizar',
            'usuarios.atualizar',
            'usuarios.excluir',
        ]);

        $this->actingAsComTermo($adminEmpresa);

        $updateResponse = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/usuarios/{$ultraAdmin->id}", [
                'nome' => 'Tentativa indevida',
            ]);

        $updateResponse
            ->assertForbidden()
            ->assertJsonPath('message', 'O usuário admin@nwbasset.local é protegido e só pode ser alterado por ele mesmo.');

        $deleteResponse = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->deleteJson("/api/v1/usuarios/{$ultraAdmin->id}");

        $deleteResponse
            ->assertForbidden()
            ->assertJsonPath('message', 'O usuário admin@nwbasset.local é protegido e só pode ser alterado por ele mesmo.');
    }

    public function test_ultra_admin_can_update_his_own_user(): void
    {
        $empresa = $this->createEmpresa('Empresa Self Update', '22345678000111');

        $ultraAdmin = $this->createUsuario(
            empresa: $empresa,
            nome: 'Administrador NWB Asset',
            email: 'admin@nwbasset.local',
            role: RoleEnum::SUPER_ADMIN->value,
            perfilEmpresa: RoleEnum::SUPER_ADMIN->value,
        );

        $this->actingAsComTermo($ultraAdmin);

        $response = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/usuarios/{$ultraAdmin->id}", [
                'nome' => 'Administrador Master',
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.nome', 'Administrador Master');
    }

    private function createEmpresa(string $nomeFantasia, string $cnpj): Empresa
    {
        return Empresa::query()->create([
            'razao_social' => "{$nomeFantasia} LTDA",
            'nome_fantasia' => $nomeFantasia,
            'cnpj' => $cnpj,
            'inscricao_estadual' => 'ISENTO',
            'email' => strtolower(str_replace(' ', '.', $nomeFantasia)).'@empresa.local',
            'telefone' => '1133333333',
            'status' => 'ativo',
        ]);
    }

    private function createUsuario(Empresa $empresa, string $nome, string $email, string $role, string $perfilEmpresa): Usuario
    {
        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => $nome,
            'email' => $email,
            'password' => 'secret123',
            'role' => $role,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, [
            'perfil' => $perfilEmpresa,
            'created_at' => now(),
        ]);

        return $usuario;
    }

    private function grantPermissions(string $role, array $permissions): void
    {
        foreach ($permissions as $permission) {
            RolePermissao::query()->firstOrCreate([
                'role' => $role,
                'permissao' => $permission,
            ]);
        }
    }
}
