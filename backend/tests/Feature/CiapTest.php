<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\CiapFator;
use App\Domain\Depreciation\Services\CiapService;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/** CIAP: credito de ICMS do ativo, 1/48 ao mes com fator de proporcionalidade. */
class CiapTest extends TestCase
{
    private Empresa $empresa;

    private array $org;

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
        $this->org = compact('filial', 'unidade', 'dep', 'local');
    }

    public function test_credito_vira_48_parcelas_de_um_quarenta_e_oito(): void
    {
        $bem = $this->bem(valorCredito: 48000, dataCredito: '2026-01-01'); // 1000/mes

        $cron = app(CiapService::class)->cronogramaDoBem($bem);

        $this->assertTrue($cron['tem_credito']);
        $this->assertCount(48, $cron['parcelas']);
        $this->assertSame(1000.0, $cron['parcelas'][0]['valor_apropriado']);
        $this->assertSame('01/2026', $cron['parcelas'][0]['mes']);
        $this->assertSame('12/2029', $cron['parcelas'][47]['mes']); // 48 meses depois
        $this->assertSame(48000.0, $cron['total_apropriado']);
        $this->assertSame(0.0, $cron['parcelas'][47]['saldo']);
    }

    public function test_fator_reduz_a_parcela_do_mes(): void
    {
        $bem = $this->bem(valorCredito: 48000, dataCredito: '2026-01-01');

        // Em 02/2026 so 60% das saidas foram tributadas.
        app(CiapService::class)->definirFator($this->empresa->id, '2026-02-01', 600, 1000);

        $cron = app(CiapService::class)->cronogramaDoBem($bem->fresh());

        $this->assertSame(1000.0, $cron['parcelas'][0]['valor_apropriado']); // jan: fator 1
        $this->assertSame(600.0, $cron['parcelas'][1]['valor_apropriado']);  // fev: 1000 x 0,6
    }

    public function test_bem_sem_credito_nao_entra_no_ciap(): void
    {
        $bem = $this->bem(valorCredito: null, dataCredito: null);

        $cron = app(CiapService::class)->cronogramaDoBem($bem);

        $this->assertFalse($cron['tem_credito']);
        $this->assertSame([], $cron['parcelas']);
    }

    public function test_apuracao_consolida_a_competencia(): void
    {
        $this->bem(valorCredito: 48000, dataCredito: '2026-01-01', tombo: 'T1'); // 1000/mes
        $this->bem(valorCredito: 24000, dataCredito: '2026-01-01', tombo: 'T2'); // 500/mes

        $apuracao = app(CiapService::class)->apuracaoDaCompetencia($this->empresa->id, '2026-01-01');

        $this->assertSame(2, $apuracao['bens']);
        $this->assertSame(1500.0, $apuracao['total_apropriado']); // 1000 + 500
    }

    public function test_definir_fator_calcula_a_proporcao(): void
    {
        $f = app(CiapService::class)->definirFator($this->empresa->id, '2026-03-01', 750, 1000);

        $this->assertSame('0.750000', (string) $f->fator);
        $this->assertSame(1, CiapFator::query()->count());
    }

    private function bem(?float $valorCredito, ?string $dataCredito, string $tombo = 'T1'): BemPatrimonial
    {
        return BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->org['filial']->id,
            'unidade_administrativa_id' => $this->org['unidade']->id,
            'departamento_id' => $this->org['dep']->id,
            'local_id' => $this->org['local']->id,
            'numero_tombo' => $tombo, 'descricao' => 'Bem', 'categoria' => 'Equipamentos',
            'data_aquisicao' => '2026-01-01', 'valor_aquisicao' => 100000,
            'valor_credito_icms' => $valorCredito, 'data_credito_icms' => $dataCredito,
            'valor_residual' => 0, 'status_bem' => 'ativo', 'estado_conservacao' => 'bom',
        ]);
    }
}
