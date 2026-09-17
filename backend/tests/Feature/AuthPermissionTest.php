<?php

namespace Tests\Feature;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthPermissionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.turnstile.enabled', false);
        config()->set('services.turnstile.secret_key', '');

        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_login_returns_token_and_current_company(): void
    {
        $empresa = Empresa::query()->create([
            'razao_social' => 'Empresa Auth LTDA',
            'nome_fantasia' => 'Empresa Auth',
            'cnpj' => '99999999999999',
            'inscricao_estadual' => 'ISENTO',
            'email' => 'auth@empresa.local',
            'telefone' => '1133333333',
            'status' => 'ativo',
        ]);

        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Admin Auth',
            'email' => 'auth@teste.local',
            'password' => 'secret123',
            'role' => RoleEnum::ADMIN_EMPRESA->value,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, [
            'perfil' => RoleEnum::ADMIN_EMPRESA->value,
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'auth@teste.local',
            'password' => 'secret123',
            'device_name' => 'phpunit',
            'empresa_id' => $empresa->id,
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'token_type',
            'access_token',
            'empresa_atual' => ['id', 'nome_fantasia'],
            'usuario' => ['id', 'nome', 'email', 'role'],
        ]);
        $response->assertJsonPath('empresa_atual.id', $empresa->id);
    }

    public function test_route_returns_403_when_role_lacks_permission(): void
    {
        $empresa = Empresa::query()->create([
            'razao_social' => 'Empresa Restrita LTDA',
            'nome_fantasia' => 'Empresa Restrita',
            'cnpj' => '88888888888888',
            'inscricao_estadual' => 'ISENTO',
            'email' => 'restrita@empresa.local',
            'telefone' => '1144444444',
            'status' => 'ativo',
        ]);

        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Operador',
            'email' => 'operador@teste.local',
            'password' => 'secret123',
            'role' => RoleEnum::OPERADOR_INVENTARIO->value,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, [
            'perfil' => RoleEnum::OPERADOR_INVENTARIO->value,
            'created_at' => now(),
        ]);

        RolePermissao::query()->create([
            'role' => RoleEnum::OPERADOR_INVENTARIO->value,
            'permissao' => 'inventarios.visualizar',
        ]);

        $this->actingAsComTermo($usuario);

        $response = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/bens');

        $response->assertForbidden();
        $response->assertJsonPath('permissao', 'bens.visualizar');
    }

    public function test_login_requires_captcha_when_enabled(): void
    {
        config()->set('services.turnstile.enabled', true);
        config()->set('services.turnstile.secret_key', 'secret-test');

        $empresa = Empresa::query()->create([
            'razao_social' => 'Empresa Captcha LTDA',
            'nome_fantasia' => 'Empresa Captcha',
            'cnpj' => '77777777777777',
            'inscricao_estadual' => 'ISENTO',
            'email' => 'captcha@empresa.local',
            'telefone' => '1155555555',
            'status' => 'ativo',
        ]);

        Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Usuario Captcha',
            'email' => 'captcha@teste.local',
            'password' => 'secret123',
            'role' => RoleEnum::ADMIN_EMPRESA->value,
            'ativo' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'captcha@teste.local',
            'password' => 'secret123',
            'device_name' => 'phpunit',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['captcha_token']);
    }

    public function test_login_rejects_invalid_captcha_token(): void
    {
        config()->set('services.turnstile.enabled', true);
        config()->set('services.turnstile.secret_key', 'secret-test');
        Http::fake([
            'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response(['success' => false], 200),
        ]);

        $empresa = Empresa::query()->create([
            'razao_social' => 'Empresa Captcha Invalida LTDA',
            'nome_fantasia' => 'Empresa Captcha Invalida',
            'cnpj' => '66666666666666',
            'inscricao_estadual' => 'ISENTO',
            'email' => 'invalid-captcha@empresa.local',
            'telefone' => '1166666666',
            'status' => 'ativo',
        ]);

        Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Usuario Captcha Invalida',
            'email' => 'invalid-captcha@teste.local',
            'password' => 'secret123',
            'role' => RoleEnum::ADMIN_EMPRESA->value,
            'ativo' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'invalid-captcha@teste.local',
            'password' => 'secret123',
            'device_name' => 'phpunit',
            'captcha_token' => 'token-invalido',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['captcha_token']);
    }
}
