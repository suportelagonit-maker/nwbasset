<?php

namespace Tests\Feature;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Notifications\Contracts\EnviadorPush;
use App\Domain\Notifications\Enums\AvisoAcessoEnum;
use App\Domain\Notifications\Models\AcessoAparelho;
use App\Domain\Notifications\Models\PushAssinatura;
use App\Domain\Notifications\Services\AvisoAcessoService;
use App\Domain\Notifications\Support\ResultadoEnvio;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * Avisos push de acesso ao sistema.
 *
 * O envio real sai para o servico de push do navegador; aqui ele e trocado
 * por um remetente de mentira que so anota o que seria enviado.
 */
class AvisosPushAcessoTest extends TestCase
{
    private EnviadorPushFalso $enviador;

    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--force' => true]);

        config()->set('push.vapid.publica', 'chave-publica-de-teste');
        config()->set('push.vapid.privada', 'chave-privada-de-teste');

        $this->enviador = new EnviadorPushFalso();
        $this->app->instance(EnviadorPush::class, $this->enviador);
    }

    public function test_entrada_de_aparelho_novo_avisa_a_propria_pessoa(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);
        $this->inscrever($pessoa);

        app(AvisoAcessoService::class)->registrarLogin($pessoa, '200.1.2.3', 'Mozilla/5.0 (Linux; Android 14) Chrome/131.0.0.0');

        $this->assertCount(1, $this->enviador->enviados);
        $this->assertSame(AvisoAcessoEnum::ENTRADA_NOVA->value, $this->enviador->enviados[0]['payload']['tag']);
        $this->assertStringContainsString('Chrome no Android', $this->enviador->enviados[0]['payload']['body']);
        $this->assertStringContainsString('200.1.2.3', $this->enviador->enviados[0]['payload']['body']);
    }

    public function test_entrada_do_mesmo_aparelho_nao_avisa_de_novo(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);
        $this->inscrever($pessoa);

        $agente = 'Mozilla/5.0 (Linux; Android 14) Chrome/131.0.0.0';
        $servico = app(AvisoAcessoService::class);

        $servico->registrarLogin($pessoa, '200.1.2.3', $agente);
        $this->enviador->enviados = [];

        // Mesma entrada, inclusive com o Chrome atualizado e outro IP.
        $servico->registrarLogin($pessoa, '200.9.9.9', 'Mozilla/5.0 (Linux; Android 14) Chrome/133.0.1.2');

        $this->assertSame([], $this->enviador->enviados);
        $this->assertSame(1, AcessoAparelho::query()->where('usuario_id', $pessoa->id)->count());
    }

    public function test_conta_criada_pelo_nwb_id_avisa_os_administradores_e_nao_a_propria_pessoa(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $admin = $this->usuario($empresa, 'admin@teste.local', RoleEnum::SUPER_ADMIN);
        $novo = $this->usuario($empresa, 'novo@teste.local', RoleEnum::AUDITOR);
        $this->inscrever($admin);
        $this->inscrever($novo);

        app(AvisoAcessoService::class)->registrarLogin($novo, '200.1.2.3', 'Chrome/131 Windows', contaRecemCriada: true);

        $this->assertCount(1, $this->enviador->enviados);
        $aviso = $this->enviador->enviados[0];
        $this->assertSame(AvisoAcessoEnum::USUARIO_NOVO->value, $aviso['payload']['tag']);
        $this->assertSame($admin->id, $aviso['usuario_id']);
        $this->assertStringContainsString('novo@teste.local', $aviso['payload']['body']);
    }

    public function test_entrada_de_administrador_em_aparelho_novo_avisa_os_outros_administradores(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $outroAdmin = $this->usuario($empresa, 'admin1@teste.local', RoleEnum::SUPER_ADMIN);
        $admin = $this->usuario($empresa, 'admin2@teste.local', RoleEnum::SUPER_ADMIN);
        $this->inscrever($outroAdmin);
        $this->inscrever($admin);

        app(AvisoAcessoService::class)->registrarLogin($admin, '200.1.2.3', 'Mozilla/5.0 (Macintosh) Safari/17');

        $tags = array_map(static fn (array $envio): string => $envio['payload']['tag'], $this->enviador->enviados);
        sort($tags);

        $this->assertSame([AvisoAcessoEnum::ACESSO_ADMIN->value, AvisoAcessoEnum::ENTRADA_NOVA->value], $tags);

        $paraOutro = array_values(array_filter(
            $this->enviador->enviados,
            static fn (array $envio): bool => $envio['payload']['tag'] === AvisoAcessoEnum::ACESSO_ADMIN->value,
        ));
        $this->assertSame($outroAdmin->id, $paraOutro[0]['usuario_id']);
    }

    public function test_quem_desligou_o_assunto_nao_recebe(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);
        $this->inscrever($pessoa);

        $this->actingAsComTermo($pessoa);
        $this->putJson('/api/v1/push/preferencias', [
            'preferencias' => [AvisoAcessoEnum::ENTRADA_NOVA->value => false],
        ])->assertOk();

        app(AvisoAcessoService::class)->registrarLogin($pessoa, '200.1.2.3', 'Chrome/131 Windows');

        $this->assertSame([], $this->enviador->enviados);
    }

    public function test_assunto_de_administrador_nao_aparece_para_usuario_comum(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);

        $this->actingAsComTermo($pessoa);
        $resposta = $this->getJson('/api/v1/push')->assertOk();

        $chaves = array_column($resposta->json('data.assuntos'), 'chave');

        $this->assertSame([AvisoAcessoEnum::ENTRADA_NOVA->value], $chaves);
        $this->assertArrayNotHasKey(AvisoAcessoEnum::USUARIO_NOVO->value, $resposta->json('data.preferencias'));
    }

    public function test_usuario_comum_nao_consegue_ligar_assunto_de_administrador(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);
        $this->inscrever($pessoa);

        $this->actingAsComTermo($pessoa);
        $this->putJson('/api/v1/push/preferencias', [
            'preferencias' => [AvisoAcessoEnum::USUARIO_NOVO->value => true],
        ])->assertOk();

        $outro = $this->usuario($empresa, 'outro@teste.local', RoleEnum::AUDITOR);
        app(AvisoAcessoService::class)->registrarLogin($outro, '200.1.2.3', 'Chrome/131 Windows', contaRecemCriada: true);

        $this->assertSame([], $this->enviador->enviados);
    }

    public function test_inscricao_do_aparelho_troca_de_dono_em_vez_de_duplicar(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $primeira = $this->usuario($empresa, 'pessoa1@teste.local', RoleEnum::AUDITOR);
        $segunda = $this->usuario($empresa, 'pessoa2@teste.local', RoleEnum::AUDITOR);

        $assinatura = [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/aparelho-compartilhado',
            'keys' => ['p256dh' => 'chave-publica-do-aparelho', 'auth' => 'segredo-do-aparelho'],
        ];

        $this->actingAsComTermo($primeira);
        $this->postJson('/api/v1/push/assinaturas', $assinatura)->assertOk();

        $this->actingAsComTermo($segunda);
        $this->postJson('/api/v1/push/assinaturas', $assinatura)->assertOk();

        $this->assertSame(1, PushAssinatura::query()->count());
        $this->assertSame($segunda->id, PushAssinatura::query()->value('usuario_id'));
    }

    public function test_aparelho_removido_para_de_receber(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);
        $endpoint = 'https://fcm.googleapis.com/fcm/send/aparelho-1';

        $this->actingAsComTermo($pessoa);
        $this->postJson('/api/v1/push/assinaturas', [
            'endpoint' => $endpoint,
            'keys' => ['p256dh' => 'chave', 'auth' => 'segredo'],
        ])->assertOk();

        $this->deleteJson('/api/v1/push/assinaturas', ['endpoint' => $endpoint])->assertOk();

        app(AvisoAcessoService::class)->registrarLogin($pessoa, '200.1.2.3', 'Chrome/131 Windows');

        $this->assertSame([], $this->enviador->enviados);
        $this->assertSame(0, PushAssinatura::query()->count());
    }

    public function test_inscricao_expirada_e_apagada_depois_do_envio(): void
    {
        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);
        $this->inscrever($pessoa);

        $this->enviador->respostaExpirada = true;

        app(AvisoAcessoService::class)->registrarLogin($pessoa, '200.1.2.3', 'Chrome/131 Windows');

        $this->assertSame(0, PushAssinatura::query()->count());
    }

    public function test_sem_chaves_vapid_nada_e_enviado(): void
    {
        config()->set('push.vapid.publica', null);
        config()->set('push.vapid.privada', null);
        $this->enviador->configurado = false;

        $empresa = $this->empresa('Cliente', '1');
        $pessoa = $this->usuario($empresa, 'pessoa@teste.local', RoleEnum::AUDITOR);
        $this->inscrever($pessoa);

        app(AvisoAcessoService::class)->registrarLogin($pessoa, '200.1.2.3', 'Chrome/131 Windows');

        $this->assertSame([], $this->enviador->enviados);

        $this->actingAsComTermo($pessoa);
        $this->getJson('/api/v1/push')->assertOk()->assertJsonPath('data.configurado', false);
    }

    public function test_ninguem_mexe_nos_avisos_sem_estar_logado(): void
    {
        $this->getJson('/api/v1/push')->assertUnauthorized();
        $this->postJson('/api/v1/push/assinaturas', [])->assertUnauthorized();
    }

    private function empresa(string $nome, string $digito): Empresa
    {
        return Empresa::query()->create([
            'razao_social' => $nome.' LTDA',
            'nome_fantasia' => $nome,
            'cnpj' => str_pad($digito, 14, '0', STR_PAD_LEFT),
            'inscricao_estadual' => 'IE'.$digito,
            'email' => 'empresa'.$digito.'@teste.local',
            'telefone' => '11999999999',
            'status' => 'ativo',
        ]);
    }

    private function usuario(Empresa $empresa, string $email, RoleEnum $perfil): Usuario
    {
        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Usuario '.$email,
            'email' => $email,
            'password' => 'secret123',
            'role' => $perfil->value,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, ['perfil' => $perfil->value, 'created_at' => now()]);

        return $usuario;
    }

    private function inscrever(Usuario $usuario): PushAssinatura
    {
        $endpoint = 'https://fcm.googleapis.com/fcm/send/'.$usuario->id;

        return PushAssinatura::query()->create([
            'usuario_id' => $usuario->id,
            'endpoint' => $endpoint,
            'endpoint_hash' => PushAssinatura::hashDoEndpoint($endpoint),
            'p256dh' => 'chave-publica-do-aparelho',
            'auth' => 'segredo-do-aparelho',
            'user_agent' => 'teste',
        ]);
    }
}

/**
 * Remetente de mentira: anota o que seria enviado, sem sair para a internet.
 */
class EnviadorPushFalso implements EnviadorPush
{
    /** @var array<int, array{usuario_id: int, payload: array<string, mixed>}> */
    public array $enviados = [];

    public bool $configurado = true;

    public bool $respostaExpirada = false;

    public function configurado(): bool
    {
        return $this->configurado;
    }

    public function enviar(array $assinaturas, array $payload): array
    {
        $resultados = [];

        foreach ($assinaturas as $assinatura) {
            $this->enviados[] = [
                'usuario_id' => (int) $assinatura->usuario_id,
                'payload' => $payload,
            ];

            $resultados[] = $this->respostaExpirada
                ? ResultadoEnvio::expirada($assinatura->id, 'inscricao expirada')
                : ResultadoEnvio::entregue($assinatura->id);
        }

        return $resultados;
    }
}
