<?php

namespace Tests\Feature;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Entrada pelo NWB ID. O Keycloak e simulado: um par de chaves RSA gerado no
 * teste assina os tokens e o JWKS do realm e servido por Http::fake.
 */
class NwbIdLoginTest extends TestCase
{
    private const ISSUER = 'https://nwbid.teste.local/realms/nwb-equipe';

    private string $privateKey;

    private array $jwks;

    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--force' => true]);
        Cache::flush();

        config([
            'nwbid.issuer' => self::ISSUER,
            'nwbid.cliente' => 'nwb-asset',
            'nwbid.clientes_aceitos' => ['nwb-asset'],
            'nwbid.sistema' => 'nwb-asset',
            'nwbid.login_senha' => true,
            'nwbid.empresa_padrao_id' => null,
            'nwbid.perfil_padrao' => 'AUDITOR',
            'nwbid.perfil_admin' => 'SUPER_ADMIN',
            'nwbid.acessos.url' => '',
            'nwbid.acessos.client_id' => '',
            'nwbid.acessos.client_secret' => '',
        ]);

        $chave = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        $pem = "";
        openssl_pkey_export($chave, $pem);
        $this->privateKey = $pem;
        $detalhes = openssl_pkey_get_details($chave);
        $this->jwks = ['keys' => [[
            'kty' => 'RSA',
            'kid' => 'teste-1',
            'use' => 'sig',
            'alg' => 'RS256',
            'n' => rtrim(strtr(base64_encode($detalhes['rsa']['n']), '+/', '-_'), '='),
            'e' => rtrim(strtr(base64_encode($detalhes['rsa']['e']), '+/', '-_'), '='),
        ]]];

        Http::fake([
            self::ISSUER.'/protocol/openid-connect/certs' => Http::response($this->jwks),
        ]);
    }

    public function test_entra_com_token_valido_e_vincula_a_conta_pelo_email(): void
    {
        $empresa = $this->criarEmpresa();
        $usuario = $this->criarUsuario($empresa, 'maria@empresa.local');

        $response = $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token(['sub' => 'sub-maria', 'email' => 'Maria@Empresa.local', 'sistemas' => ['nwb-asset', 'nc-edu']]),
        ]);

        $response->assertOk()
            ->assertJsonPath('usuario.email', 'maria@empresa.local')
            ->assertJsonPath('empresa_atual.id', $empresa->id)
            ->assertJsonPath('termo_pendente', true);
        $this->assertNotEmpty($response->json('access_token'));

        $usuario->refresh();
        $this->assertSame('sub-maria', $usuario->nwb_sub);
        $this->assertSame('NWB', $usuario->auth_origem);
    }

    public function test_recusa_quem_nao_tem_o_sistema_liberado_no_acessos(): void
    {
        $empresa = $this->criarEmpresa();
        $this->criarUsuario($empresa, 'maria@empresa.local');

        $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token(['sub' => 'sub-maria', 'email' => 'maria@empresa.local', 'sistemas' => ['nc-edu']]),
        ])->assertStatus(403);
    }

    public function test_recusa_token_emitido_para_outro_sistema(): void
    {
        $empresa = $this->criarEmpresa();
        $this->criarUsuario($empresa, 'maria@empresa.local');

        $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token(['sub' => 'sub-maria', 'email' => 'maria@empresa.local', 'sistemas' => ['nwb-asset'], 'azp' => 'nc-edu', 'aud' => 'account']),
        ])->assertStatus(401);
    }

    public function test_liberado_no_acessos_sem_cadastro_tem_a_conta_criada_a_partir_do_nwbid(): void
    {
        $empresa = $this->criarEmpresa();
        config(['nwbid.empresa_padrao_id' => $empresa->id]);

        $response = $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token([
                'sub' => 'sub-novo',
                'email' => 'novo@empresa.local',
                'name' => 'Pessoa Liberada',
                'sistemas' => ['nwb-asset'],
            ]),
        ]);

        $response->assertOk()
            ->assertJsonPath('usuario.email', 'novo@empresa.local')
            ->assertJsonPath('usuario.nome', 'Pessoa Liberada')
            ->assertJsonPath('usuario.role', RoleEnum::AUDITOR->value)
            ->assertJsonPath('empresa_atual.id', $empresa->id);

        $criado = Usuario::query()->where('nwb_sub', 'sub-novo')->firstOrFail();
        $this->assertSame('NWB', $criado->auth_origem);
        $this->assertTrue($criado->ativo);
        $this->assertTrue($criado->empresas()->where('empresas.id', $empresa->id)->exists());
    }

    public function test_sem_empresa_padrao_a_pessoa_e_orientada_a_procurar_o_administrador(): void
    {
        $this->criarEmpresa();
        config(['nwbid.empresa_padrao_id' => null]);

        $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token(['sub' => 'sub-novo', 'email' => 'novo@empresa.local', 'sistemas' => ['nwb-asset']]),
        ])->assertStatus(403)
            ->assertJsonFragment(['message' => 'Nao foi possivel criar seu acesso automaticamente: o NWB Asset esta sem empresa padrao configurada. Procure o administrador do sistema.']);
    }

    public function test_nome_da_pessoa_acompanha_o_nwbid(): void
    {
        $empresa = $this->criarEmpresa();
        $usuario = $this->criarUsuario($empresa, 'maria@empresa.local');

        $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token([
                'sub' => 'sub-maria',
                'email' => 'maria@empresa.local',
                'name' => 'Maria Gestora de Oliveira',
                'sistemas' => ['nwb-asset'],
            ]),
        ])->assertOk();

        $this->assertSame('Maria Gestora de Oliveira', $usuario->refresh()->nome);
    }

    public function test_administrador_no_acessos_e_provisionado_na_primeira_entrada(): void
    {
        $empresa = $this->criarEmpresa();
        config([
            'nwbid.empresa_padrao_id' => $empresa->id,
            'nwbid.acessos.url' => 'https://acessos.teste.local',
            'nwbid.acessos.client_id' => 'nwb-asset-api',
            'nwbid.acessos.client_secret' => 'segredo',
        ]);
        Http::fake([
            self::ISSUER.'/protocol/openid-connect/certs' => Http::response($this->jwks),
            self::ISSUER.'/protocol/openid-connect/token' => Http::response(['access_token' => 'servico', 'expires_in' => 300]),
            'https://acessos.teste.local/servico/administradores' => Http::response(['dados' => [['sub' => 'sub-admin']]]),
        ]);

        // Administra, mas a claim "sistemas" nao traz o nwb-asset (administrar nao poe o sistema na claim).
        $response = $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token(['sub' => 'sub-admin', 'email' => 'admin@empresa.local', 'name' => 'Ana Administradora', 'sistemas' => []]),
        ]);

        $response->assertOk()->assertJsonPath('usuario.role', RoleEnum::SUPER_ADMIN->value);

        $criado = Usuario::query()->where('nwb_sub', 'sub-admin')->firstOrFail();
        $this->assertSame('Ana Administradora', $criado->nome);
        $this->assertSame('NWB', $criado->auth_origem);
        $this->assertTrue($criado->empresas()->where('empresas.id', $empresa->id)->exists());
    }

    public function test_login_por_senha_e_desligado_por_padrao_com_nwbid_configurado(): void
    {
        $empresa = $this->criarEmpresa();
        $this->criarUsuario($empresa, 'maria@empresa.local');
        config(['nwbid.login_senha' => false]);

        $this->postJson('/api/v1/auth/login', ['email' => 'maria@empresa.local', 'password' => 'secret123'])
            ->assertStatus(403);

        $this->getJson('/api/v1/auth/nwbid/config')
            ->assertOk()
            ->assertJsonPath('data.login_senha', false)
            ->assertJsonPath('data.habilitado', true)
            ->assertJsonPath('data.cliente', 'nwb-asset');
    }

    public function test_sem_nwbid_configurado_a_senha_continua_aceita(): void
    {
        $empresa = $this->criarEmpresa();
        $this->criarUsuario($empresa, 'maria@empresa.local');
        config(['nwbid.login_senha' => false, 'nwbid.issuer' => '']);

        $this->postJson('/api/v1/auth/login', ['email' => 'maria@empresa.local', 'password' => 'secret123'])->assertOk();
        $this->getJson('/api/v1/auth/nwbid/config')->assertJsonPath('data.login_senha', true)->assertJsonPath('data.habilitado', false);
    }

    public function test_perfil_padrao_da_conta_nova_e_configuravel(): void
    {
        $empresa = $this->criarEmpresa();
        config(['nwbid.empresa_padrao_id' => $empresa->id, 'nwbid.perfil_padrao' => RoleEnum::OPERADOR_INVENTARIO->value]);

        $this->postJson('/api/v1/auth/nwbid', [
            'access_token' => $this->token(['sub' => 'sub-op', 'email' => 'operador@empresa.local', 'sistemas' => ['nwb-asset']]),
        ])->assertOk()->assertJsonPath('usuario.role', RoleEnum::OPERADOR_INVENTARIO->value);
    }

    private function token(array $claims): string
    {
        $agora = time();

        return JWT::encode(array_merge([
            'iss' => self::ISSUER,
            'azp' => 'nwb-asset',
            'aud' => 'account',
            'iat' => $agora,
            'exp' => $agora + 300,
            'typ' => 'Bearer',
        ], $claims), $this->privateKey, 'RS256', 'teste-1');
    }

    private function criarEmpresa(): Empresa
    {
        return Empresa::query()->create([
            'razao_social' => 'Empresa NWB ID LTDA',
            'nome_fantasia' => 'Empresa NWB ID',
            'cnpj' => '12345678000188',
            'inscricao_estadual' => 'ISENTO',
            'email' => 'contato@empresa.local',
            'telefone' => '1133333333',
            'status' => 'ativo',
        ]);
    }

    private function criarUsuario(Empresa $empresa, string $email): Usuario
    {
        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Maria Gestora',
            'email' => $email,
            'password' => 'secret123',
            'role' => RoleEnum::GESTOR_PATRIMONIAL->value,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, [
            'perfil' => RoleEnum::GESTOR_PATRIMONIAL->value,
            'created_at' => now(),
        ]);

        return $usuario;
    }
}
