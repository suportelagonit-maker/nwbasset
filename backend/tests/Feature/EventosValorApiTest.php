<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Depreciation\Models\EventoValorBem;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class EventosValorApiTest extends TestCase
{
    private Empresa $empresa;

    private BemPatrimonial $bem;

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);

        $this->empresa = Empresa::query()->create([
            'razao_social' => 'E LTDA', 'nome_fantasia' => 'E', 'cnpj' => str_pad('1', 14, '0', STR_PAD_LEFT),
            'inscricao_estadual' => 'IE1', 'email' => 'e@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $filial = Filial::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'M', 'codigo' => 'F1', 'cnpj' => str_pad('2', 14, '0', STR_PAD_LEFT),
            'endereco' => 'R', 'cidade' => 'SP', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $unidade = UnidadeAdministrativa::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id, 'nome' => 'U', 'codigo' => 'U1', 'descricao' => 'u', 'status' => 'ativo',
        ]);
        $dep = Departamento::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id, 'unidade_administrativa_id' => $unidade->id,
            'nome' => 'D', 'codigo' => 'D1', 'descricao' => 'd', 'status' => 'ativo',
        ]);
        $local = Local::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id, 'unidade_administrativa_id' => $unidade->id,
            'departamento_id' => $dep->id, 'nome' => 'L', 'codigo' => 'L1', 'endereco' => 'R', 'descricao' => 'l', 'status' => 'ativo',
        ]);
        $metodoId = MetodoDepreciacao::query()->firstOrCreate(['codigo' => 'LINHA_RETA'], ['nome' => 'Linha Reta', 'descricao' => '-'])->id;
        RegraDepreciacaoTipoBem::query()->create([
            'empresa_id' => $this->empresa->id, 'tipo_bem' => 'Equipamentos', 'base_regra' => 'fiscal',
            'metodo_depreciacao_id' => $metodoId, 'metodo_depreciacao' => 'linha_reta', 'vida_util_anos' => 10,
            'taxa_anual' => 10, 'taxa_anual_percentual' => 10, 'valor_residual_percentual' => 0, 'coeficiente_aceleracao' => 1,
            'depreciavel' => true, 'ativo' => true, 'data_inicio_vigencia' => '2020-01-01',
        ]);
        $this->bem = BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id, 'unidade_administrativa_id' => $unidade->id,
            'departamento_id' => $dep->id, 'local_id' => $local->id, 'numero_tombo' => 'T1', 'descricao' => 'Bem',
            'categoria' => 'Equipamentos', 'data_aquisicao' => '2026-01-01', 'data_inicio_uso' => '2026-01-01',
            'valor_aquisicao' => 12000, 'valor_residual' => 0, 'status_bem' => 'ativo', 'estado_conservacao' => 'bom',
        ]);

        foreach (['bens.visualizar', 'depreciacoes.visualizar', 'depreciacoes.criar', 'depreciacoes.excluir'] as $p) {
            RolePermissao::query()->firstOrCreate(['role' => RoleEnum::GESTOR_PATRIMONIAL->value, 'permissao' => $p]);
            RolePermissao::query()->firstOrCreate(['role' => RoleEnum::AUDITOR->value, 'permissao' => $p === 'bens.visualizar' ? $p : 'bens.visualizar']);
        }
    }

    public function test_gestor_registra_evento_e_a_memoria_recalcula(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::GESTOR_PATRIMONIAL));

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/bens/{$this->bem->id}/eventos-valor", [
                'tipo' => 'ACRESCIMO', 'competencia' => '2027-01-01', 'valor' => 11880,
            ])
            ->assertCreated();

        $this->assertSame(1, EventoValorBem::query()->count());

        // A memoria reflete o evento: a quota de 01/2027 sobe.
        $memoria = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/bens/{$this->bem->id}/cronograma-depreciacao?ate=2027-01-31")
            ->assertOk();

        $ultima = collect($memoria->json('data.parcelas'))->firstWhere('competencia', '2027-01-01');
        $this->assertSame(210, $ultima['valor_depreciacao']);
    }

    public function test_baixa_parcial_total_e_recusada(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::GESTOR_PATRIMONIAL));

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/bens/{$this->bem->id}/eventos-valor", [
                'tipo' => 'BAIXA_PARCIAL', 'competencia' => '2027-01-01', 'valor' => 12000,
            ])
            ->assertStatus(422);
    }

    public function test_evento_anterior_ao_inicio_e_recusado(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::GESTOR_PATRIMONIAL));

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/bens/{$this->bem->id}/eventos-valor", [
                'tipo' => 'ACRESCIMO', 'competencia' => '2025-01-01', 'valor' => 1000,
            ])
            ->assertStatus(422);
    }

    public function test_remover_evento_volta_o_calculo(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::GESTOR_PATRIMONIAL));
        $cabecalho = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($cabecalho)->postJson("/api/v1/bens/{$this->bem->id}/eventos-valor", [
            'tipo' => 'ACRESCIMO', 'competencia' => '2027-01-01', 'valor' => 11880,
        ])->assertCreated();

        $evento = EventoValorBem::query()->first();
        $this->withHeaders($cabecalho)->deleteJson("/api/v1/bens/{$this->bem->id}/eventos-valor/{$evento->id}")->assertOk();

        $this->assertSame(0, EventoValorBem::query()->count());
    }

    public function test_auditor_sem_permissao_de_criar_nao_registra(): void
    {
        $this->actingAsComTermo($this->usuario(RoleEnum::AUDITOR));

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/bens/{$this->bem->id}/eventos-valor", [
                'tipo' => 'ACRESCIMO', 'competencia' => '2027-01-01', 'valor' => 1000,
            ])
            ->assertForbidden();
    }

    public function test_evento_em_bem_de_outra_empresa_nao_e_alcancado(): void
    {
        $outra = Empresa::query()->create([
            'razao_social' => 'O LTDA', 'nome_fantasia' => 'O', 'cnpj' => str_pad('9', 14, '0', STR_PAD_LEFT),
            'inscricao_estadual' => 'IE9', 'email' => 'o@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $this->bem->update(['empresa_id' => $outra->id]);

        $this->actingAsComTermo($this->usuario(RoleEnum::GESTOR_PATRIMONIAL));

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/bens/{$this->bem->id}/eventos-valor")
            ->assertNotFound();
    }

    private function usuario(RoleEnum $papel): Usuario
    {
        $u = Usuario::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'U', 'email' => $papel->value.'@teste.local',
            'password' => 'secret123', 'role' => $papel->value, 'ativo' => true,
        ]);
        $u->empresas()->attach($this->empresa->id, ['perfil' => $papel->value, 'created_at' => now()]);

        return $u;
    }
}
