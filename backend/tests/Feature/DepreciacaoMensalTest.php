<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\TipoProduto;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\ProducaoBem;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use App\Domain\Depreciation\Services\CronogramaDepreciacaoService;
use App\Domain\Depreciation\Services\RazaoDepreciacaoService;
use App\Domain\Depreciation\Services\TabelaPadraoDepreciacaoService;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * O motor de depreciacao segundo a regra brasileira: quota mensal a partir
 * do mes em que o bem entra em uso, duas bases convivendo, metodos que de
 * fato mudam a conta e parada na baixa.
 */
class DepreciacaoMensalTest extends TestCase
{
    private Empresa $empresa;

    private Filial $filial;

    private UnidadeAdministrativa $unidade;

    private Departamento $departamento;

    private Local $local;

    private int $metodoLinhaId;

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);

        $this->empresa = Empresa::query()->create([
            'razao_social' => 'Empresa Teste LTDA', 'nome_fantasia' => 'Empresa Teste',
            'cnpj' => str_pad('1', 14, '0', STR_PAD_LEFT), 'inscricao_estadual' => 'IE1',
            'email' => 'e@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $this->filial = Filial::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'Matriz', 'codigo' => 'FIL-1',
            'cnpj' => str_pad('2', 14, '0', STR_PAD_LEFT), 'endereco' => 'Rua 1',
            'cidade' => 'Sao Paulo', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $this->unidade = UnidadeAdministrativa::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id,
            'nome' => 'Unidade', 'codigo' => 'UNI-1', 'descricao' => 'u', 'status' => 'ativo',
        ]);
        $this->departamento = Departamento::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id,
            'unidade_administrativa_id' => $this->unidade->id,
            'nome' => 'Dep', 'codigo' => 'DEP-1', 'descricao' => 'd', 'status' => 'ativo',
        ]);
        $this->local = Local::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id,
            'unidade_administrativa_id' => $this->unidade->id, 'departamento_id' => $this->departamento->id,
            'nome' => 'Local', 'codigo' => 'LOC-1', 'endereco' => 'Rua', 'descricao' => 'l', 'status' => 'ativo',
        ]);

        $this->metodoLinhaId = (int) MetodoDepreciacao::query()->firstOrCreate(
            ['codigo' => 'LINHA_RETA'], ['nome' => 'Linha Reta', 'descricao' => '-'],
        )->id;
    }

    public function test_bem_comprado_em_dezembro_deprecia_apenas_um_mes_no_ano(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $bem = $this->bem('Informatica', '2026-12-20', 10000.00);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2026-12-31');

        $this->assertCount(1, $cronograma['parcelas']);
        $this->assertSame(166.67, $cronograma['parcelas'][0]->valorDepreciacao);
        $this->assertSame(9833.33, $cronograma['parcelas'][0]->valorContabil);
    }

    public function test_virada_de_ano_acrescenta_apenas_um_mes(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $bem = $this->bem('Informatica', '2026-12-20', 10000.00);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2027-01-31');
        $ultima = end($cronograma['parcelas']);

        $this->assertCount(2, $cronograma['parcelas']);
        $this->assertSame(333.34, $ultima->acumulado);
    }

    public function test_depreciacao_comeca_na_data_de_inicio_de_uso_e_nao_na_compra(): void
    {
        $this->regra('Equipamentos', 10, 10.0);
        $bem = $this->bem('Equipamentos', '2026-01-10', 12000.00);
        // Comprado em janeiro, instalado so em abril.
        $bem->update(['data_inicio_uso' => '2026-04-15']);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem->fresh(), 'fiscal', '2026-12-31');

        $this->assertSame('2026-04-01', $cronograma['inicio']);
        $this->assertCount(9, $cronograma['parcelas']);
    }

    public function test_soma_do_cronograma_fecha_exatamente_com_o_valor_depreciavel(): void
    {
        // 10.000 / 36 nao e exato: a ultima parcela tem de absorver a sobra.
        $this->regra('Equipamentos', 3, 33.3333);
        $bem = $this->bem('Equipamentos', '2026-01-01', 10000.00);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2028-12-31');
        $soma = array_sum(array_map(fn ($p) => $p->valorDepreciacao, $cronograma['parcelas']));

        $this->assertCount(36, $cronograma['parcelas']);
        $this->assertSame(10000.00, round($soma, 2));
        $this->assertSame(0.0, end($cronograma['parcelas'])->valorContabil);
    }

    public function test_valor_residual_limita_a_depreciacao(): void
    {
        $this->regra('Veiculos', 5, 20.0, residual: 20.0);
        $bem = $this->bem('Veiculos', '2026-01-01', 100000.00);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2031-12-31');

        $this->assertSame(20000.00, $cronograma['valor_residual']);
        $this->assertSame(80000.00, $cronograma['valor_depreciavel']);
        $this->assertSame(20000.00, end($cronograma['parcelas'])->valorContabil);
    }

    public function test_soma_dos_digitos_deprecia_mais_no_primeiro_ano(): void
    {
        $this->regra('Equipamentos', 5, 20.0, metodo: 'soma_digitos');
        $bem = $this->bem('Equipamentos', '2026-01-01', 10000.00);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2026-12-31');
        $primeiroAno = array_sum(array_map(fn ($p) => $p->valorDepreciacao, $cronograma['parcelas']));

        // 5/15 de 10.000 = 3.333,33 (linha reta daria 2.000).
        $this->assertSame(3333.36, round($primeiroAno, 2));
    }

    public function test_unidades_produzidas_so_deprecia_no_mes_com_producao(): void
    {
        $this->regra('Equipamentos', 10, 10.0, metodo: 'unidades_produzidas', unidades: 100000);
        $bem = $this->bem('Equipamentos', '2026-01-01', 50000.00);

        ProducaoBem::query()->create([
            'empresa_id' => $this->empresa->id, 'bem_patrimonial_id' => $bem->id,
            'competencia' => '2026-02-01', 'unidades' => 10000,
        ]);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2026-06-30');

        $this->assertCount(1, $cronograma['parcelas']);
        $this->assertSame('2026-02-01', $cronograma['parcelas'][0]->competenciaIso());
        // 10.000 de 100.000 = 10% de 50.000.
        $this->assertSame(5000.00, $cronograma['parcelas'][0]->valorDepreciacao);
    }

    public function test_coeficiente_de_turnos_acelera_a_depreciacao(): void
    {
        $this->regra('Equipamentos', 10, 10.0, coeficiente: 2.0);
        $bem = $this->bem('Equipamentos', '2026-01-01', 12000.00);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2026-12-31');
        $noAno = array_sum(array_map(fn ($p) => $p->valorDepreciacao, $cronograma['parcelas']));

        // Tres turnos: dobra a quota (art. 323 do RIR/2018).
        $this->assertSame(2400.00, round($noAno, 2));
    }

    public function test_bem_baixado_para_de_depreciar_no_mes_da_baixa(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $bem = $this->bem('Informatica', '2026-01-01', 12000.00);
        $bem->baixas()->create([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->filial->id,
            'data_baixa' => '2026-03-10',
            'motivo_baixa' => 'OBSOLESCENCIA',
            'valor_baixa' => 1000,
        ]);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem->fresh(), 'fiscal', '2026-12-31');

        $this->assertCount(3, $cronograma['parcelas']);
        $this->assertSame('2026-03-01', end($cronograma['parcelas'])->competenciaIso());
    }

    public function test_terreno_nao_deprecia(): void
    {
        $this->regra('Terrenos', 0, 0.0, depreciavel: false);
        $bem = $this->bem('Terrenos', '2026-01-01', 500000.00);

        $cronograma = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2026-12-31');

        $this->assertFalse($cronograma['depreciavel']);
        $this->assertSame([], $cronograma['parcelas']);
    }

    public function test_regra_do_produto_vence_a_regra_do_tipo_de_bem(): void
    {
        $tipoBemId = TipoBemPatrimonial::query()->create(['empresa_id' => $this->empresa->id, 'nome' => 'Veiculos'])->id;
        $caminhaoId = TipoProduto::query()->create([
            'empresa_id' => $this->empresa->id, 'tipo_bem_id' => $tipoBemId, 'nome' => 'Caminhao', 'ativo' => true,
        ])->id;

        $this->regra('Veiculos', 5, 20.0);
        $this->regra('Veiculos', 4, 25.0, tipoProdutoId: $caminhaoId);

        $carro = $this->bem('Veiculos', '2026-01-01', 120000.00, 'TOMBO-CARRO');
        $caminhao = $this->bem('Veiculos', '2026-01-01', 120000.00, 'TOMBO-CAMINHAO');
        $caminhao->update(['tipo_produto_id' => $caminhaoId]);

        $servico = app(CronogramaDepreciacaoService::class);
        $doCarro = $servico->gerar($carro, 'fiscal', '2026-12-31');
        $doCaminhao = $servico->gerar($caminhao->fresh(), 'fiscal', '2026-12-31');

        $this->assertSame(5, $doCarro['regra']['vida_util_anos']);
        $this->assertSame(2000.00, round($doCarro['parcelas'][0]->valorDepreciacao, 2));

        $this->assertSame(4, $doCaminhao['regra']['vida_util_anos']);
        $this->assertSame(2500.00, round($doCaminhao['parcelas'][0]->valorDepreciacao, 2));
    }

    public function test_fiscal_e_societaria_convivem_na_mesma_competencia(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $this->regra('Informatica', 10, 10.0, base: 'contabil');
        $bem = $this->bem('Informatica', '2026-01-01', 12000.00);

        $razao = app(RazaoDepreciacaoService::class);
        $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'fiscal');
        $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'contabil');

        $linhas = DepreciacaoBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->whereDate('competencia', '2026-01-01')
            ->pluck('valor_depreciacao_periodo', 'base_regra');

        $this->assertSame('200.00', $linhas['fiscal']);
        $this->assertSame('100.00', $linhas['contabil']);
    }

    public function test_recalcular_a_mesma_competencia_nao_duplica(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $this->bem('Informatica', '2026-01-01', 12000.00);

        $razao = app(RazaoDepreciacaoService::class);
        $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'fiscal');
        $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'fiscal');

        $this->assertSame(1, DepreciacaoBem::query()->count());
    }

    public function test_processar_ate_preenche_todos_os_meses_em_aberto(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $this->bem('Informatica', '2026-01-01', 12000.00);

        $resultado = app(RazaoDepreciacaoService::class)
            ->processarAte($this->empresa->id, '2026-06-30', 'fiscal');

        $this->assertSame(6, $resultado['competencias_processadas']);
        $this->assertSame(1200.00, $resultado['valor_total']);
        $this->assertSame(6, DepreciacaoBem::query()->count());
        $this->assertSame('1200.00', DepreciacaoBem::query()->orderByDesc('competencia')->value('valor_depreciado_acumulado'));
    }

    public function test_competencia_fechada_nao_e_recalculada(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $this->bem('Informatica', '2026-01-01', 12000.00);

        $razao = app(RazaoDepreciacaoService::class);
        $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'fiscal');
        $razao->fechar($this->empresa->id, '2026-01-31', 'fiscal');

        $this->expectException(ValidationException::class);
        $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'fiscal');
    }

    public function test_reabertura_registra_motivo_e_libera_o_recalculo(): void
    {
        $this->regra('Informatica', 5, 20.0);
        $this->bem('Informatica', '2026-01-01', 12000.00);

        $razao = app(RazaoDepreciacaoService::class);
        $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'fiscal');
        $razao->fechar($this->empresa->id, '2026-01-31', 'fiscal');
        $fechamento = $razao->reabrir($this->empresa->id, '2026-01-31', 'fiscal', 'Taxa corrigida pelo contador.');

        $this->assertSame('Taxa corrigida pelo contador.', $fechamento->motivo_reabertura);

        $resultado = $razao->processarCompetencia($this->empresa->id, '2026-01-31', 'fiscal');
        $this->assertSame(1, $resultado['bens_depreciados']);
    }

    public function test_tabela_da_receita_nasce_nas_duas_bases_com_as_taxas_oficiais(): void
    {
        TipoProduto::query()->create(['empresa_id' => $this->empresa->id, 'nome' => 'Caminhão', 'ativo' => true]);

        app(TabelaPadraoDepreciacaoService::class)->aplicarNaEmpresa($this->empresa->id);

        $fiscal = RegraDepreciacaoTipoBem::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('base_regra', 'fiscal');

        $taxaDe = fn (string $tipo) => (float) (clone $fiscal)->where('tipo_bem', $tipo)->whereNull('tipo_produto_id')->value('taxa_anual_percentual');

        $this->assertSame(4.0, $taxaDe('Edificacoes'));
        $this->assertSame(10.0, $taxaDe('Equipamentos'));
        $this->assertSame(10.0, $taxaDe('Mobiliario'));
        $this->assertSame(20.0, $taxaDe('Informatica'));
        $this->assertSame(20.0, $taxaDe('Veiculos'));
        $this->assertFalse((bool) (clone $fiscal)->where('tipo_bem', 'Terrenos')->value('depreciavel'));

        // O caminhao entra com a taxa propria, amarrado ao produto.
        $caminhao = (clone $fiscal)->whereNotNull('tipo_produto_id')->where('nome_regra', 'Veiculos / Caminhao')->first();
        $this->assertNotNull($caminhao);
        $this->assertSame(4, (int) $caminhao->vida_util_anos);
        $this->assertSame(25.0, (float) $caminhao->taxa_anual_percentual);

        $this->assertTrue(
            RegraDepreciacaoTipoBem::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('base_regra', 'contabil')
                ->exists(),
        );
    }

    public function test_reaplicar_a_tabela_nao_apaga_ajuste_do_cliente(): void
    {
        app(TabelaPadraoDepreciacaoService::class)->aplicarNaEmpresa($this->empresa->id);

        RegraDepreciacaoTipoBem::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('base_regra', 'contabil')
            ->where('tipo_bem', 'Informatica')
            ->update(['vida_util_anos' => 3, 'taxa_anual_percentual' => 33.3333]);

        app(TabelaPadraoDepreciacaoService::class)->aplicarNaEmpresa($this->empresa->id);

        $this->assertSame(3, (int) RegraDepreciacaoTipoBem::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('base_regra', 'contabil')
            ->where('tipo_bem', 'Informatica')
            ->value('vida_util_anos'));
    }

    private function regra(
        string $tipoBem,
        int $vida,
        float $taxa,
        string $metodo = 'linha_reta',
        float $residual = 0,
        bool $depreciavel = true,
        float $coeficiente = 1,
        ?int $unidades = null,
        ?int $tipoProdutoId = null,
        string $base = 'fiscal',
    ): void {
        RegraDepreciacaoTipoBem::query()->updateOrCreate(
            [
                'empresa_id' => $this->empresa->id,
                'tipo_bem' => $tipoBem,
                'base_regra' => $base,
                'tipo_produto_id' => $tipoProdutoId,
            ],
            [
                'metodo_depreciacao_id' => $this->metodoLinhaId,
                'metodo_depreciacao' => $metodo,
                'vida_util_anos' => $vida,
                'taxa_anual' => $taxa,
                'taxa_anual_percentual' => $taxa,
                'valor_residual_percentual' => $residual,
                'coeficiente_aceleracao' => $coeficiente,
                'unidades_vida_util' => $unidades,
                'depreciavel' => $depreciavel,
                'ativo' => true,
                'data_inicio_vigencia' => '2020-01-01',
            ],
        );
    }

    private function bem(string $categoria, string $aquisicao, float $valor, string $tombo = 'TOMBO-1'): BemPatrimonial
    {
        return BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->filial->id,
            'unidade_administrativa_id' => $this->unidade->id,
            'departamento_id' => $this->departamento->id,
            'local_id' => $this->local->id,
            'numero_tombo' => $tombo,
            'descricao' => 'Bem de teste',
            'categoria' => $categoria,
            'data_aquisicao' => $aquisicao,
            'data_inicio_uso' => $aquisicao,
            'valor_aquisicao' => $valor,
            'valor_residual' => 0,
            'status_bem' => 'ativo',
            'estado_conservacao' => 'bom',
        ]);
    }
}
