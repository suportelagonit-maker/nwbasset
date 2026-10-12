<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\EventoValorBem;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Services\CronogramaDepreciacaoService;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * Eventos de valor (acrescimo, reavaliacao, impairment, baixa parcial)
 * recalculam a depreciacao prospectivamente (CPC 27).
 */
class EventosValorDepreciacaoTest extends TestCase
{
    private Empresa $empresa;

    private Filial $filial;

    private UnidadeAdministrativa $unidade;

    private Departamento $departamento;

    private Local $local;

    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);

        $this->empresa = Empresa::query()->create([
            'razao_social' => 'E LTDA', 'nome_fantasia' => 'E', 'cnpj' => str_pad('1', 14, '0', STR_PAD_LEFT),
            'inscricao_estadual' => 'IE1', 'email' => 'e@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $this->filial = Filial::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'M', 'codigo' => 'F1', 'cnpj' => str_pad('2', 14, '0', STR_PAD_LEFT),
            'endereco' => 'R', 'cidade' => 'SP', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $this->unidade = UnidadeAdministrativa::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id, 'nome' => 'U', 'codigo' => 'U1', 'descricao' => 'u', 'status' => 'ativo',
        ]);
        $this->departamento = Departamento::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id, 'unidade_administrativa_id' => $this->unidade->id,
            'nome' => 'D', 'codigo' => 'D1', 'descricao' => 'd', 'status' => 'ativo',
        ]);
        $this->local = Local::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id, 'unidade_administrativa_id' => $this->unidade->id,
            'departamento_id' => $this->departamento->id, 'nome' => 'L', 'codigo' => 'L1', 'endereco' => 'R', 'descricao' => 'l', 'status' => 'ativo',
        ]);

        MetodoDepreciacao::query()->firstOrCreate(['codigo' => 'LINHA_RETA'], ['nome' => 'Linha Reta', 'descricao' => '-']);
    }

    public function test_acrescimo_aumenta_a_quota_a_partir_da_competencia(): void
    {
        // Bem de 12.000, 10 anos (120 meses): 100/mes.
        $this->regra('Equipamentos', 10, 10.0);
        $bem = $this->bem('Equipamentos', 12000);

        // No mes 13, benfeitoria de 11.880. Valor contabil no fim do mes 12 =
        // 12.000 - 1.200 = 10.800; + 11.880 = 22.680 sobre 108 meses = 210/mes.
        $this->evento($bem, 'ACRESCIMO', '2027-01-01', 11880);

        $cron = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2035-12-31');
        $porMes = $this->porMes($cron['parcelas']);

        $this->assertSame(100.0, $porMes['2026-12']); // antes do evento
        $this->assertSame(210.0, $porMes['2027-01']); // depois do evento
    }

    public function test_reavaliacao_redefine_o_valor_contabil(): void
    {
        $this->regra('Equipamentos', 10, 10.0);
        $bem = $this->bem('Equipamentos', 12000);

        // No mes 13, reavaliado para 21.600, com nova vida de 108 meses.
        $this->evento($bem, 'REAVALIACAO', '2027-01-01', 21600, 108);

        $cron = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2035-12-31');
        $porMes = $this->porMes($cron['parcelas']);

        // 21.600 / 108 = 200/mes a partir do evento.
        $this->assertSame(200.0, $porMes['2027-01']);
    }

    public function test_impairment_reduz_o_valor_contabil(): void
    {
        $this->regra('Equipamentos', 10, 10.0);
        $bem = $this->bem('Equipamentos', 12000);

        // No mes 13, impairment de 5.400. Contabil 10.800 - 5.400 = 5.400
        // sobre 108 meses = 50/mes.
        $this->evento($bem, 'IMPAIRMENT', '2027-01-01', 5400);

        $cron = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2035-12-31');
        $porMes = $this->porMes($cron['parcelas']);

        $this->assertSame(50.0, $porMes['2027-01']);
    }

    public function test_baixa_parcial_reduz_proporcionalmente(): void
    {
        $this->regra('Equipamentos', 10, 10.0);
        $bem = $this->bem('Equipamentos', 12000);

        // No mes 13, baixa parcial de metade do contabil (5.400 de 10.800).
        // Resta 5.400 sobre 108 meses = 50/mes.
        $this->evento($bem, 'BAIXA_PARCIAL', '2027-01-01', 5400);

        $cron = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2035-12-31');
        $porMes = $this->porMes($cron['parcelas']);

        $this->assertSame(50.0, $porMes['2027-01']);
    }

    public function test_sem_eventos_o_calculo_nao_muda(): void
    {
        $this->regra('Equipamentos', 10, 10.0);
        $bem = $this->bem('Equipamentos', 12000);

        $cron = app(CronogramaDepreciacaoService::class)->gerar($bem, 'fiscal', '2027-12-31');
        $porMes = $this->porMes($cron['parcelas']);

        $this->assertSame(100.0, $porMes['2026-01']);
        $this->assertSame(100.0, $porMes['2027-01']);
    }

    /** @param array<int, \App\Domain\Depreciation\Support\ParcelaDepreciacao> $parcelas */
    private function porMes(array $parcelas): array
    {
        $m = [];
        foreach ($parcelas as $p) {
            $m[$p->competencia->format('Y-m')] = $p->valorDepreciacao;
        }

        return $m;
    }

    private function regra(string $tipo, int $vida, float $taxa): void
    {
        RegraDepreciacaoTipoBem::query()->create([
            'empresa_id' => $this->empresa->id, 'tipo_bem' => $tipo, 'base_regra' => 'fiscal',
            'metodo_depreciacao_id' => MetodoDepreciacao::query()->where('codigo', 'LINHA_RETA')->value('id'),
            'metodo_depreciacao' => 'linha_reta', 'vida_util_anos' => $vida, 'taxa_anual' => $taxa,
            'taxa_anual_percentual' => $taxa, 'valor_residual_percentual' => 0, 'coeficiente_aceleracao' => 1,
            'depreciavel' => true, 'ativo' => true, 'data_inicio_vigencia' => '2020-01-01',
        ]);
    }

    private function bem(string $categoria, float $valor): BemPatrimonial
    {
        return BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id,
            'unidade_administrativa_id' => $this->unidade->id, 'departamento_id' => $this->departamento->id,
            'local_id' => $this->local->id, 'numero_tombo' => 'T1', 'descricao' => 'Bem',
            'categoria' => $categoria, 'data_aquisicao' => '2026-01-01', 'data_inicio_uso' => '2026-01-01',
            'valor_aquisicao' => $valor, 'valor_residual' => 0, 'status_bem' => 'ativo', 'estado_conservacao' => 'bom',
        ]);
    }

    private function evento(BemPatrimonial $bem, string $tipo, string $competencia, float $valor, ?int $novaVida = null): void
    {
        EventoValorBem::query()->create([
            'empresa_id' => $this->empresa->id, 'bem_patrimonial_id' => $bem->id, 'tipo' => $tipo,
            'competencia' => $competencia, 'valor' => $valor, 'nova_vida_util_meses' => $novaVida,
        ]);
    }
}
