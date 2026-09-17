<?php

namespace Tests\Feature;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\TermoUsoAceite;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TermoUsoAceiteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_login_informa_termo_pendente_no_primeiro_acesso(): void
    {
        $this->createUsuario();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'maria@empresa.local',
            'password' => 'secret123',
        ]);

        $response->assertOk();
        $response->assertJsonPath('termo_pendente', true);
        $response->assertJsonPath('termo_versao', config('termo_uso.versao'));
    }

    public function test_api_bloqueia_com_428_ate_o_aceite_e_libera_depois(): void
    {
        $usuario = $this->createUsuario();
        Sanctum::actingAs($usuario);

        $this->getJson('/api/v1/bens', ['X-Empresa-Id' => $usuario->empresa_id])
            ->assertStatus(428)
            ->assertJsonPath('codigo', 'TERMO_USO_PENDENTE');

        // Ler o termo e sair continuam liberados.
        $this->getJson('/api/v1/termo-uso')->assertOk()->assertJsonPath('data.pendente', true);
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('termo_pendente', true);

        // Aceite sem marcar a caixa nao vale.
        $this->postJson('/api/v1/termo-uso/aceite', ['aceito' => false, 'versao' => config('termo_uso.versao')])
            ->assertStatus(422);

        $this->postJson('/api/v1/termo-uso/aceite', ['aceito' => true, 'versao' => config('termo_uso.versao')])
            ->assertOk()
            ->assertJsonPath('data.nome_usuario', 'Maria Gestora')
            ->assertJsonPath('data.versao', config('termo_uso.versao'));

        $this->getJson('/api/v1/bens', ['X-Empresa-Id' => $usuario->empresa_id])->assertOk();
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('termo_pendente', false);
    }

    public function test_aceite_guarda_nome_data_ip_e_hash_do_texto(): void
    {
        $usuario = $this->createUsuario();
        Sanctum::actingAs($usuario);

        $this->postJson('/api/v1/termo-uso/aceite', ['aceito' => true, 'versao' => config('termo_uso.versao')])->assertOk();

        $aceite = TermoUsoAceite::query()->where('usuario_id', $usuario->id)->firstOrFail();
        $this->assertSame('Maria Gestora', $aceite->nome_usuario);
        $this->assertSame('maria@empresa.local', $aceite->email_usuario);
        $this->assertNotNull($aceite->aceito_em);
        $this->assertNotEmpty($aceite->ip);
        $this->assertSame(64, strlen($aceite->hash_conteudo));

        // Aceitar de novo nao duplica.
        $this->postJson('/api/v1/termo-uso/aceite', ['aceito' => true, 'versao' => config('termo_uso.versao')])->assertOk();
        $this->assertSame(1, TermoUsoAceite::query()->where('usuario_id', $usuario->id)->count());
    }

    public function test_nova_versao_do_termo_exige_novo_aceite(): void
    {
        $usuario = $this->createUsuario();
        Sanctum::actingAs($usuario);

        $this->postJson('/api/v1/termo-uso/aceite', ['aceito' => true, 'versao' => config('termo_uso.versao')])->assertOk();
        $this->getJson('/api/v1/auth/me')->assertJsonPath('termo_pendente', false);

        config(['termo_uso.versao' => '9.9']);

        $this->getJson('/api/v1/auth/me')->assertJsonPath('termo_pendente', true);
        $this->getJson('/api/v1/bens', ['X-Empresa-Id' => $usuario->empresa_id])->assertStatus(428);
    }

    private function createUsuario(): Usuario
    {
        $empresa = Empresa::query()->create([
            'razao_social' => 'Empresa Termo LTDA',
            'nome_fantasia' => 'Empresa Termo',
            'cnpj' => '12345678000199',
            'inscricao_estadual' => 'ISENTO',
            'email' => 'contato@empresa.local',
            'telefone' => '1133333333',
            'status' => 'ativo',
        ]);

        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Maria Gestora',
            'email' => 'maria@empresa.local',
            'password' => 'secret123',
            'role' => RoleEnum::SUPER_ADMIN->value,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, [
            'perfil' => RoleEnum::SUPER_ADMIN->value,
            'created_at' => now(),
        ]);

        return $usuario;
    }
}
