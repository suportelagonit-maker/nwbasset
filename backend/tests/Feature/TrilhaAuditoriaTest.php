<?php

namespace Tests\Feature;

use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** A trilha de auditoria: feed unico de acessos e operacoes, por empresa. */
class TrilhaAuditoriaTest extends TestCase
{
    private Empresa $empresa;

    private Empresa $outra;

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);

        $this->empresa = $this->empresa('A', '1');
        $this->outra = $this->empresa('B', '2');

        // Um evento de acesso e um de operacao em cada empresa.
        $this->eventoAcesso($this->empresa->id, 'login', 'Login da empresa A');
        $this->eventoOperacao($this->empresa->id, 'BAIXA_BEM');
        $this->eventoAcesso($this->outra->id, 'login', 'Login da empresa B');
    }

    public function test_feed_une_acessos_e_operacoes_da_empresa_ativa(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::AUDITOR));

        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/trilha-auditoria')
            ->assertOk();

        // 2 eventos da empresa A (um acesso, uma operacao); nada da empresa B.
        $this->assertSame(2, $resposta->json('meta.total'));
        $fontes = array_column($resposta->json('data'), 'fonte');
        sort($fontes);
        $this->assertSame(['acesso', 'operacao'], $fontes);
    }

    public function test_filtro_por_fonte(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::AUDITOR));

        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/trilha-auditoria?fonte=operacao')
            ->assertOk();

        $this->assertSame(1, $resposta->json('meta.total'));
        $this->assertSame('BAIXA_BEM', $resposta->json('data.0.evento'));
        $this->assertSame('Baixa de bem', $resposta->json('data.0.rotulo'));
    }

    public function test_nao_mostra_eventos_de_outra_empresa(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::AUDITOR));

        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/trilha-auditoria?busca=empresa B')
            ->assertOk();

        $this->assertSame(0, $resposta->json('meta.total'));
    }

    public function test_perfil_sem_permissao_e_barrado(): void
    {
        // OPERADOR_INVENTARIO nao recebe auditoria.visualizar neste teste.
        $operador = Usuario::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'Operador', 'email' => 'op@teste.local',
            'password' => 'secret123', 'role' => RoleEnum::OPERADOR_INVENTARIO->value, 'ativo' => true,
        ]);
        $operador->empresas()->attach($this->empresa->id, ['perfil' => RoleEnum::OPERADOR_INVENTARIO->value, 'created_at' => now()]);
        $this->actingAsComTermo($operador);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/trilha-auditoria')
            ->assertForbidden();
    }

    private function usuario(RoleEnum $papel): Usuario
    {
        RolePermissao::query()->firstOrCreate(['role' => $papel->value, 'permissao' => 'auditoria.visualizar']);

        $u = Usuario::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'Auditor', 'email' => 'auditor@teste.local',
            'password' => 'secret123', 'role' => $papel->value, 'ativo' => true,
        ]);
        $u->empresas()->attach($this->empresa->id, ['perfil' => $papel->value, 'created_at' => now()]);

        return $u;
    }

    private function empresa(string $sufixo, string $digito): Empresa
    {
        return Empresa::query()->create([
            'razao_social' => "Empresa {$sufixo} LTDA", 'nome_fantasia' => "Empresa {$sufixo}",
            'cnpj' => str_pad($digito, 14, '0', STR_PAD_LEFT), 'inscricao_estadual' => "IE{$sufixo}",
            'email' => "e{$digito}@teste.local", 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
    }

    private function eventoAcesso(int $empresaId, string $evento, string $descricao): void
    {
        DB::table('auditoria_eventos')->insert([
            'empresa_id' => $empresaId, 'usuario_id' => null, 'evento' => $evento,
            'entidade_tipo' => 'auth.login', 'descricao' => $descricao, 'ip_address' => '200.1.2.3',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function eventoOperacao(int $empresaId, string $operacao): void
    {
        DB::table('logs_operacoes_patrimoniais')->insert([
            'empresa_id' => $empresaId, 'usuario_id' => null, 'operacao' => $operacao,
            'entidade' => 'bem', 'entidade_id' => 1, 'created_at' => now(),
        ]);
    }
}
