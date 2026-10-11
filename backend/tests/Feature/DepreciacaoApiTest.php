<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/** As operacoes de depreciacao pela API, do jeito que a tela usa. */
class DepreciacaoApiTest extends TestCase
{
    private Empresa $empresa;

    private BemPatrimonial $bem;

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);

        $this->empresa = Empresa::query()->create([
            'razao_social' => 'Empresa Teste LTDA', 'nome_fantasia' => 'Empresa Teste',
            'cnpj' => str_pad('1', 14, '0', STR_PAD_LEFT), 'inscricao_estadual' => 'IE1',
            'email' => 'e@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $filial = Filial::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'Matriz', 'codigo' => 'FIL-1',
            'cnpj' => str_pad('2', 14, '0', STR_PAD_LEFT), 'endereco' => 'Rua 1',
            'cidade' => 'Sao Paulo', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $unidade = UnidadeAdministrativa::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id,
            'nome' => 'Unidade', 'codigo' => 'UNI-1', 'descricao' => 'u', 'status' => 'ativo',
        ]);
        $departamento = Departamento::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id,
            'nome' => 'Dep', 'codigo' => 'DEP-1', 'descricao' => 'd', 'status' => 'ativo',
        ]);
        $local = Local::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id, 'departamento_id' => $departamento->id,
            'nome' => 'Local', 'codigo' => 'LOC-1', 'endereco' => 'Rua', 'descricao' => 'l', 'status' => 'ativo',
        ]);

        $metodoId = MetodoDepreciacao::query()->firstOrCreate(
            ['codigo' => 'LINHA_RETA'], ['nome' => 'Linha Reta', 'descricao' => '-'],
        )->id;

        RegraDepreciacaoTipoBem::query()->create([
            'empresa_id' => $this->empresa->id, 'tipo_bem' => 'Informatica', 'base_regra' => 'fiscal',
            'metodo_depreciacao_id' => $metodoId, 'metodo_depreciacao' => 'linha_reta',
            'vida_util_anos' => 5, 'taxa_anual' => 20, 'taxa_anual_percentual' => 20,
            'valor_residual_percentual' => 0, 'depreciavel' => true, 'ativo' => true,
            'data_inicio_vigencia' => '2020-01-01',
        ]);

        $this->bem = BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id, 'departamento_id' => $departamento->id,
            'local_id' => $local->id, 'numero_tombo' => 'TOMBO-1', 'descricao' => 'Notebook',
            'categoria' => 'Informatica', 'data_aquisicao' => '2026-01-10',
            'data_inicio_uso' => '2026-01-10', 'valor_aquisicao' => 12000, 'valor_residual' => 0,
            'status_bem' => 'ativo', 'estado_conservacao' => 'bom',
        ]);

        foreach (['bens.visualizar', 'bens.criar', 'bens.atualizar', 'depreciacoes.visualizar', 'depreciacoes.criar'] as $permissao) {
            RolePermissao::query()->firstOrCreate(['role' => RoleEnum::SUPER_ADMIN->value, 'permissao' => $permissao]);
        }

        $usuario = Usuario::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'Gestor', 'email' => 'gestor@teste.local',
            'password' => 'secret123', 'role' => RoleEnum::SUPER_ADMIN->value, 'ativo' => true,
        ]);
        $usuario->empresas()->attach($this->empresa->id, ['perfil' => RoleEnum::SUPER_ADMIN->value, 'created_at' => now()]);

        $this->actingAsComTermo($usuario);
    }

    public function test_apura_a_competencia_e_devolve_o_total(): void
    {
        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/depreciacao/processar', ['competencia' => '2026-03-31'])
            ->assertOk();

        $this->assertSame(3, $resposta->json('data.competencias_processadas'));
        $this->assertSame(600, $resposta->json('data.valor_total'));
    }

    public function test_fechamento_congela_o_mes_e_o_aberto_segue_a_regra_atual(): void
    {
        $cabecalho = ['X-Empresa-Id' => (string) $this->empresa->id];

        // Tres meses apurados com a regra de 5 anos: 200,00 por mes.
        $this->withHeaders($cabecalho)
            ->postJson('/api/v1/depreciacao/processar', ['competencia' => '2026-03-31'])
            ->assertOk();

        $this->withHeaders($cabecalho)
            ->postJson('/api/v1/depreciacao/fechar', ['competencia' => '2026-02-28'])
            ->assertOk();

        // O contador revisa a vida util para 10 anos: 100,00 por mes.
        RegraDepreciacaoTipoBem::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('tipo_bem', 'Informatica')
            ->update(['vida_util_anos' => 10, 'taxa_anual_percentual' => 10, 'taxa_anual' => 10]);

        $this->withHeaders($cabecalho)
            ->postJson('/api/v1/depreciacao/processar', ['competencia' => '2026-03-31'])
            ->assertOk();

        $porMes = DepreciacaoBem::query()
            ->where('bem_patrimonial_id', $this->bem->id)
            ->where('base_regra', 'fiscal')
            ->orderBy('competencia')
            ->pluck('valor_depreciacao_periodo', 'competencia')
            ->mapWithKeys(fn ($valor, $competencia) => [substr((string) $competencia, 0, 7) => $valor])
            ->all();

        // Janeiro e fevereiro estao fechados: intocados.
        $this->assertSame('200.00', $porMes['2026-01']);
        $this->assertSame('200.00', $porMes['2026-02']);
        // Marco estava aberto: recalculado com a regra nova.
        $this->assertSame('100.00', $porMes['2026-03']);
    }

    public function test_reabertura_exige_motivo(): void
    {
        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/depreciacao/fechar', ['competencia' => '2026-01-31'])->assertOk();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/depreciacao/reabrir', ['competencia' => '2026-01-31', 'motivo' => 'curto'])
            ->assertStatus(422);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/depreciacao/reabrir', [
                'competencia' => '2026-01-31',
                'motivo' => 'Taxa revisada pelo contador apos conferencia.',
            ])
            ->assertOk();
    }

    public function test_memoria_de_calculo_do_bem_mostra_as_parcelas(): void
    {
        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/bens/{$this->bem->id}/cronograma-depreciacao")
            ->assertOk();

        $this->assertSame(60, count($resposta->json('data.parcelas')));
        $this->assertSame('01/2026', $resposta->json('data.parcelas.0.mes'));
        $this->assertSame(200, $resposta->json('data.parcelas.0.valor_depreciacao'));
        $this->assertSame(0, $resposta->json('data.parcelas.59.valor_contabil'));
        $this->assertSame(5, $resposta->json('data.regra.vida_util_anos'));
    }

    public function test_aplica_a_tabela_da_receita_na_empresa(): void
    {
        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/depreciacao/tabela-padrao')
            ->assertOk();

        $this->assertGreaterThan(0, $resposta->json('data.criadas'));

        $this->assertTrue(
            RegraDepreciacaoTipoBem::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('base_regra', 'contabil')
                ->where('tipo_bem', 'Terrenos')
                ->where('depreciavel', false)
                ->exists(),
        );
    }

    public function test_apuracao_nao_alcanca_bem_de_outra_empresa(): void
    {
        $outra = Empresa::query()->create([
            'razao_social' => 'Outra LTDA', 'nome_fantasia' => 'Outra',
            'cnpj' => str_pad('9', 14, '0', STR_PAD_LEFT), 'inscricao_estadual' => 'IE9',
            'email' => 'o@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $filialOutra = Filial::query()->create([
            'empresa_id' => $outra->id, 'nome' => 'Matriz', 'codigo' => 'FIL-9',
            'cnpj' => str_pad('8', 14, '0', STR_PAD_LEFT), 'endereco' => 'Rua 9',
            'cidade' => 'Sao Paulo', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $unidadeOutra = UnidadeAdministrativa::query()->create([
            'empresa_id' => $outra->id, 'filial_id' => $filialOutra->id,
            'nome' => 'Unidade', 'codigo' => 'UNI-9', 'descricao' => 'u', 'status' => 'ativo',
        ]);
        $departamentoOutra = Departamento::query()->create([
            'empresa_id' => $outra->id, 'filial_id' => $filialOutra->id,
            'unidade_administrativa_id' => $unidadeOutra->id,
            'nome' => 'Dep', 'codigo' => 'DEP-9', 'descricao' => 'd', 'status' => 'ativo',
        ]);
        $localOutra = Local::query()->create([
            'empresa_id' => $outra->id, 'filial_id' => $filialOutra->id,
            'unidade_administrativa_id' => $unidadeOutra->id, 'departamento_id' => $departamentoOutra->id,
            'nome' => 'Local', 'codigo' => 'LOC-9', 'endereco' => 'Rua', 'descricao' => 'l', 'status' => 'ativo',
        ]);
        $bemDaOutra = BemPatrimonial::query()->create([
            'empresa_id' => $outra->id, 'filial_id' => $filialOutra->id,
            'unidade_administrativa_id' => $unidadeOutra->id, 'departamento_id' => $departamentoOutra->id,
            'local_id' => $localOutra->id, 'numero_tombo' => 'TOMBO-9', 'descricao' => 'Notebook da outra',
            'categoria' => 'Informatica', 'data_aquisicao' => '2026-01-10',
            'data_inicio_uso' => '2026-01-10', 'valor_aquisicao' => 9000, 'valor_residual' => 0,
            'status_bem' => 'ativo', 'estado_conservacao' => 'bom',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/depreciacao/processar', ['competencia' => '2026-03-31'])
            ->assertOk();

        $this->assertSame(0, $bemDaOutra->depreciacoes()->count());
        $this->assertSame(3, $this->bem->depreciacoes()->count());
    }
}
