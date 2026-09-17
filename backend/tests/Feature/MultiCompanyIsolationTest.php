<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Inventory\Models\InventarioItem;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MultiCompanyIsolationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_bens_index_returns_only_records_from_active_empresa(): void
    {
        $stackA = $this->createEmpresaStack('A');
        $stackB = $this->createEmpresaStack('B');
        $user = $this->createUserForEmpresa($stackA['empresa']);

        $this->actingAsComTermo($user);

        $response = $this->withHeader('X-Empresa-Id', (string) $stackA['empresa']->id)
            ->getJson('/api/v1/bens');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $stackA['bem']->id);
        $response->assertJsonMissing(['id' => $stackB['bem']->id]);
    }

    public function test_bem_show_returns_404_when_resource_belongs_to_another_empresa(): void
    {
        $stackA = $this->createEmpresaStack('A');
        $stackB = $this->createEmpresaStack('B');
        $user = $this->createUserForEmpresa($stackA['empresa']);

        $this->actingAsComTermo($user);

        $response = $this->withHeader('X-Empresa-Id', (string) $stackA['empresa']->id)
            ->getJson("/api/v1/bens/{$stackB['bem']->id}");

        $response->assertNotFound();
    }

    public function test_inventario_itens_are_scoped_by_empresa_through_inventario(): void
    {
        $stackA = $this->createEmpresaStack('A');
        $stackB = $this->createEmpresaStack('B');
        $user = $this->createUserForEmpresa($stackA['empresa']);

        $this->actingAsComTermo($user);

        $response = $this->withHeader('X-Empresa-Id', (string) $stackA['empresa']->id)
            ->getJson('/api/v1/inventario-itens');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $stackA['inventario_item']->id);
        $response->assertJsonMissing(['id' => $stackB['inventario_item']->id]);
    }

    public function test_request_is_forbidden_when_user_tries_to_access_unrelated_empresa(): void
    {
        $stackA = $this->createEmpresaStack('A');
        $stackB = $this->createEmpresaStack('B');
        $user = $this->createUserForEmpresa($stackA['empresa']);

        $this->actingAsComTermo($user);

        $response = $this->withHeader('X-Empresa-Id', (string) $stackB['empresa']->id)
            ->getJson('/api/v1/inventarios');

        $response->assertForbidden();
    }

    private function createEmpresaStack(string $suffix): array
    {
        $empresa = Empresa::query()->create([
            'razao_social' => "Empresa {$suffix} LTDA",
            'nome_fantasia' => "Empresa {$suffix}",
            'cnpj' => str_pad($suffix === 'A' ? '1' : '2', 14, '0', STR_PAD_LEFT),
            'inscricao_estadual' => "IE{$suffix}",
            'email' => "empresa{$suffix}@teste.local",
            'telefone' => '11999999999',
            'status' => 'ativo',
        ]);

        $filial = Filial::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => "Filial {$suffix}",
            'codigo' => "FIL-{$suffix}",
            'cnpj' => str_pad($suffix === 'A' ? '3' : '4', 14, '0', STR_PAD_LEFT),
            'endereco' => "Endereco {$suffix}",
            'cidade' => 'Sao Paulo',
            'estado' => 'SP',
            'status' => 'ativo',
        ]);

        $unidade = UnidadeAdministrativa::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'nome' => "Unidade {$suffix}",
            'codigo' => "UNI-{$suffix}",
            'descricao' => "Unidade {$suffix}",
            'status' => 'ativo',
        ]);

        $departamento = Departamento::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id,
            'nome' => "Departamento {$suffix}",
            'codigo' => "DEP-{$suffix}",
            'descricao' => "Departamento {$suffix}",
            'status' => 'ativo',
        ]);

        $local = Local::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id,
            'departamento_id' => $departamento->id,
            'nome' => "Local {$suffix}",
            'codigo' => "LOC-{$suffix}",
            'endereco' => "Endereco local {$suffix}",
            'descricao' => "Local {$suffix}",
            'status' => 'ativo',
        ]);

        $responsavel = Responsavel::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'nome' => "Responsavel {$suffix}",
            'matricula' => "MAT-{$suffix}",
            'cpf' => str_pad($suffix === 'A' ? '5' : '6', 11, '0', STR_PAD_LEFT),
            'email' => "responsavel{$suffix}@teste.local",
            'telefone' => '11988888888',
            'cargo' => 'Analista',
            'status' => 'ativo',
        ]);

        $bem = BemPatrimonial::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id,
            'departamento_id' => $departamento->id,
            'local_id' => $local->id,
            'responsavel_id' => $responsavel->id,
            'numero_tombo' => "TOMBO-{$suffix}",
            'numero_serie' => "SERIE-{$suffix}",
            'descricao' => "Notebook {$suffix}",
            'categoria' => 'TI',
            'marca' => 'Dell',
            'modelo' => 'Latitude',
            'data_aquisicao' => '2026-01-01',
            'valor_aquisicao' => 2500,
            'valor_residual' => 250,
            'vida_util_anos' => 5,
            'status_bem' => 'ativo',
            'estado_conservacao' => 'bom',
        ]);

        $inventario = Inventario::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'nome' => "Inventario {$suffix}",
            'data_inicio' => '2026-03-01',
            'status' => 'ABERTO',
        ]);

        $inventarioItem = InventarioItem::query()->create([
            'inventario_id' => $inventario->id,
            'bem_patrimonial_id' => $bem->id,
            'localizado' => false,
            'observacoes' => null,
        ]);

        return [
            'empresa' => $empresa,
            'filial' => $filial,
            'bem' => $bem,
            'inventario' => $inventario,
            'inventario_item' => $inventarioItem,
        ];
    }

    private function createUserForEmpresa(Empresa $empresa): Usuario
    {
        $this->grantPermissions(RoleEnum::ADMIN_EMPRESA->value, [
            'bens.visualizar',
            'inventarios.visualizar',
        ]);

        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Usuario Multiempresa',
            'email' => "usuario{$empresa->id}@teste.local",
            'password' => 'secret123',
            'role' => RoleEnum::ADMIN_EMPRESA->value,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, [
            'perfil' => RoleEnum::ADMIN_EMPRESA->value,
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
