<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Enums\OrigemParametroDepreciacaoEnum;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacaoBem;
use App\Domain\Depreciation\Services\DepreciacaoService;
use App\Domain\Depreciation\Services\RegraDepreciacaoEfetivaResolverService;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DepreciacaoRegraEfetivaTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);
        $this->criarMetodoLinhaReta();
    }

    public function test_veiculo_usa_preset_padrao_de_cinco_anos_e_vinte_por_cento(): void
    {
        $empresa = $this->criarEmpresa('A');
        $service = app(DepreciacaoService::class);

        $regra = $service->obterOuCriarRegraPadraoPorTipoBem($empresa->id, 'Veiculos');

        $this->assertNotNull($regra);
        $this->assertSame(5, (int) $regra->vida_util_anos);
        $this->assertEqualsWithDelta(20.0, (float) ($regra->taxa_anual_percentual ?? $regra->taxa_anual), 0.0001);
        $this->assertTrue((bool) $regra->depreciavel);
    }

    public function test_informatica_usa_preset_padrao_de_cinco_anos_e_vinte_por_cento(): void
    {
        $empresa = $this->criarEmpresa('B');
        $service = app(DepreciacaoService::class);

        $regra = $service->obterOuCriarRegraPadraoPorTipoBem($empresa->id, 'Informatica');

        $this->assertNotNull($regra);
        $this->assertSame(5, (int) $regra->vida_util_anos);
        $this->assertEqualsWithDelta(20.0, (float) ($regra->taxa_anual_percentual ?? $regra->taxa_anual), 0.0001);
        $this->assertTrue((bool) $regra->depreciavel);
    }

    public function test_terreno_fica_nao_depreciavel_por_padrao(): void
    {
        $estrutura = $this->criarEstruturaEmpresa('C');
        $bem = $this->criarBem($estrutura, 'Terrenos');
        $service = app(DepreciacaoService::class);
        $resolver = app(RegraDepreciacaoEfetivaResolverService::class);

        $service->obterOuCriarRegraPadraoPorTipoBem($estrutura['empresa']->id, 'Terrenos');
        $regraEfetiva = $resolver->resolverRegraEfetivaParaBem($bem);

        $this->assertFalse((bool) $regraEfetiva['depreciavel']);
        $this->assertEqualsWithDelta(0.0, (float) $regraEfetiva['taxa_anual_percentual'], 0.0001);
    }

    public function test_edificacao_e_depreciavel_com_regra_padrao(): void
    {
        $estrutura = $this->criarEstruturaEmpresa('D');
        $bem = $this->criarBem($estrutura, 'Edificacoes');
        $service = app(DepreciacaoService::class);
        $resolver = app(RegraDepreciacaoEfetivaResolverService::class);

        $service->obterOuCriarRegraPadraoPorTipoBem($estrutura['empresa']->id, 'Edificacoes');
        $regraEfetiva = $resolver->resolverRegraEfetivaParaBem($bem);

        $this->assertTrue((bool) $regraEfetiva['depreciavel']);
        $this->assertSame('regra_padrao', $regraEfetiva['origem_da_regra']);
        $this->assertSame(25, (int) $regraEfetiva['vida_util_anos']);
    }

    public function test_parametro_do_bem_herdado_da_regra_padrao_e_criado_automaticamente(): void
    {
        $estrutura = $this->criarEstruturaEmpresa('E');
        $bem = $this->criarBem($estrutura, 'Informatica');
        $service = app(DepreciacaoService::class);

        $service->obterOuCriarRegraPadraoPorTipoBem($estrutura['empresa']->id, 'Informatica');
        $service->herdarRegraDepreciacaoParaBem($bem, null);

        $this->assertDatabaseHas('parametros_depreciacao_bens', [
            'bem_patrimonial_id' => $bem->id,
            'empresa_id' => $estrutura['empresa']->id,
            'origem_parametro' => OrigemParametroDepreciacaoEnum::HERDADO_REGRA->value,
            'base_regra_aplicada' => 'fiscal',
            'vida_util_anos' => 5,
            'ativo' => true,
        ]);
    }

    public function test_override_manual_do_bem_tem_prioridade_sobre_regra_padrao(): void
    {
        $estrutura = $this->criarEstruturaEmpresa('F');
        $bem = $this->criarBem($estrutura, 'Informatica');
        $service = app(DepreciacaoService::class);
        $resolver = app(RegraDepreciacaoEfetivaResolverService::class);

        $regra = $service->obterOuCriarRegraPadraoPorTipoBem($estrutura['empresa']->id, 'Informatica');

        ParametroDepreciacaoBem::query()->create([
            'empresa_id' => $estrutura['empresa']->id,
            'bem_patrimonial_id' => $bem->id,
            'regra_depreciacao_id' => $regra?->id,
            'base_regra_aplicada' => 'fiscal',
            'metodo_depreciacao' => 'linha_reta',
            'metodo_depreciacao_id' => $this->criarMetodoLinhaReta()->id,
            'vida_util_anos' => 8,
            'taxa_anual_percentual' => 12.5,
            'valor_residual_percentual' => 10,
            'depreciavel' => true,
            'motivo_override' => 'Ajuste tecnico por condicao de uso',
            'origem_parametro' => OrigemParametroDepreciacaoEnum::MANUAL->value,
            'ativo' => true,
        ]);

        $regraEfetiva = $resolver->resolverRegraEfetivaParaBem($bem);

        $this->assertSame('parametro_bem', $regraEfetiva['origem_da_regra']);
        $this->assertSame(8, (int) $regraEfetiva['vida_util_anos']);
        $this->assertEqualsWithDelta(12.5, (float) $regraEfetiva['taxa_anual_percentual'], 0.0001);
    }

    public function test_fallback_legado_e_utilizado_quando_nao_ha_regra_nova(): void
    {
        $estrutura = $this->criarEstruturaEmpresa('G');
        $bem = $this->criarBem($estrutura, 'CategoriaLegadaSemRegra');
        $resolver = app(RegraDepreciacaoEfetivaResolverService::class);
        $metodoLinhaReta = $this->criarMetodoLinhaReta();

        ParametroDepreciacao::query()->create([
            'empresa_id' => $estrutura['empresa']->id,
            'metodo_depreciacao_id' => $metodoLinhaReta->id,
            'vida_util_padrao' => 5,
            'taxa_padrao' => 20,
        ]);

        $regraEfetiva = $resolver->resolverRegraEfetivaParaBem($bem, 'fiscal');

        $this->assertSame('fallback_legado', $regraEfetiva['origem_da_regra']);
        $this->assertSame(5, (int) $regraEfetiva['vida_util_anos']);
        $this->assertEqualsWithDelta(20.0, (float) $regraEfetiva['taxa_anual_percentual'], 0.0001);
    }

    public function test_bem_nao_depreciavel_bloqueia_registro_de_depreciacao(): void
    {
        $estrutura = $this->criarEstruturaEmpresa('H');
        $bem = $this->criarBem($estrutura, 'Terrenos');
        $service = app(DepreciacaoService::class);

        ParametroDepreciacaoBem::query()->create([
            'empresa_id' => $estrutura['empresa']->id,
            'bem_patrimonial_id' => $bem->id,
            'base_regra_aplicada' => 'fiscal',
            'metodo_depreciacao' => 'linha_reta',
            'metodo_depreciacao_id' => $this->criarMetodoLinhaReta()->id,
            'vida_util_anos' => null,
            'taxa_anual_percentual' => 0,
            'valor_residual_percentual' => 0,
            'depreciavel' => false,
            'origem_parametro' => OrigemParametroDepreciacaoEnum::MANUAL->value,
            'ativo' => true,
        ]);

        $this->expectException(ValidationException::class);

        $service->registrarDepreciacao([
            'empresa_id' => $estrutura['empresa']->id,
            'bem_patrimonial_id' => $bem->id,
            'metodo_depreciacao_id' => $this->criarMetodoLinhaReta()->id,
            'valor_aquisicao' => 1000,
            'valor_residual' => 0,
            'vida_util_anos' => 5,
            'data_calculo' => now()->toDateString(),
        ]);
    }

    private function criarMetodoLinhaReta(): MetodoDepreciacao
    {
        return MetodoDepreciacao::query()->firstOrCreate(
            ['codigo' => 'LINHA_RETA'],
            [
                'nome' => 'Linha Reta',
                'descricao' => 'Metodo linear padrao',
            ],
        );
    }

    private function criarEmpresa(string $suffix): Empresa
    {
        return Empresa::query()->create([
            'razao_social' => "Empresa {$suffix} LTDA",
            'nome_fantasia' => "Empresa {$suffix}",
            'cnpj' => str_pad((string) (1000 + ord($suffix)), 14, '0', STR_PAD_LEFT),
            'inscricao_estadual' => "IE{$suffix}",
            'email' => "empresa{$suffix}@teste.local",
            'telefone' => '11999999999',
            'status' => 'ativo',
        ]);
    }

    private function criarEstruturaEmpresa(string $suffix): array
    {
        $empresa = $this->criarEmpresa($suffix);

        $filial = Filial::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => "Filial {$suffix}",
            'codigo' => "FIL-{$suffix}",
            'cnpj' => str_pad((string) (2000 + ord($suffix)), 14, '0', STR_PAD_LEFT),
            'matriz' => true,
            'status' => 'ativo',
        ]);

        $unidade = UnidadeAdministrativa::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'nome' => "Unidade {$suffix}",
            'codigo' => "UNI-{$suffix}",
            'status' => 'ativo',
        ]);

        $departamento = Departamento::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id,
            'nome' => "Departamento {$suffix}",
            'codigo' => "DEP-{$suffix}",
            'status' => 'ativo',
        ]);

        $local = Local::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id,
            'departamento_id' => $departamento->id,
            'nome' => "Local {$suffix}",
            'codigo' => "LOC-{$suffix}",
            'status' => 'ativo',
        ]);

        $responsavel = Responsavel::query()->create([
            'empresa_id' => $empresa->id,
            'filial_id' => $filial->id,
            'nome' => "Responsavel {$suffix}",
            'matricula' => "MAT-{$suffix}",
            'status' => 'ativo',
        ]);

        return [
            'empresa' => $empresa,
            'filial' => $filial,
            'unidade' => $unidade,
            'departamento' => $departamento,
            'local' => $local,
            'responsavel' => $responsavel,
        ];
    }

    private function criarBem(array $estrutura, string $categoria): BemPatrimonial
    {
        return BemPatrimonial::query()->create([
            'empresa_id' => $estrutura['empresa']->id,
            'filial_id' => $estrutura['filial']->id,
            'unidade_administrativa_id' => $estrutura['unidade']->id,
            'departamento_id' => $estrutura['departamento']->id,
            'local_id' => $estrutura['local']->id,
            'responsavel_id' => $estrutura['responsavel']->id,
            'numero_tombo' => 'TOMBO-' . strtoupper(substr(sha1($categoria . microtime()), 0, 8)),
            'descricao' => "Bem {$categoria}",
            'categoria' => $categoria,
            'data_aquisicao' => now()->subYears(2)->toDateString(),
            'valor_aquisicao' => 10000,
            'valor_residual' => 0,
            'vida_util_anos' => 5,
            'status_bem' => 'ativo',
            'estado_conservacao' => 'bom',
        ]);
    }
}

