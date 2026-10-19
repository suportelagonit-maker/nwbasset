<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Services\CiapService;
use App\Domain\Depreciation\Services\SpedBlocoGService;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/** RASCUNHO do Bloco G (CIAP): estrutura dos registros e pendencias do contador. */
class SpedBlocoGTest extends TestCase
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

    public function test_gera_g001_g110_g125_e_g990_para_bem_com_credito(): void
    {
        $this->bem(valorCredito: 48000, dataCredito: '2026-01-01', tombo: 'T1'); // 1000/mes

        $out = app(SpedBlocoGService::class)->gerar($this->empresa, '2026-01-01');

        $this->assertSame('01/2026', $out['mes']);
        $this->assertSame(1, $out['bens']);

        $regs = array_map(static fn (string $l): string => explode('|', $l)[1], $out['linhas']);
        $this->assertSame(['G001', 'G110', 'G125', 'G990'], $regs);

        // G001 com dados -> IND_MOV = 0
        $this->assertSame('|G001|0|', $out['linhas'][0]);
        // G990 fecha com a contagem de linhas (4: G001, G110, G125, G990)
        $this->assertSame('|G990|4|', $out['linhas'][3]);
    }

    public function test_g125_traz_parcela_de_um_quarenta_e_oito_sem_fator(): void
    {
        $this->bem(valorCredito: 48000, dataCredito: '2026-01-01', tombo: 'T1');
        // fator reduzido no mes nao muda VL_PARC_PASS (1/48), so o apropriado do G110
        app(CiapService::class)->definirFator($this->empresa->id, '2026-01-01', 500, 1000);

        $out = app(SpedBlocoGService::class)->gerar($this->empresa, '2026-01-01');

        $g125 = collect($out['linhas'])->first(fn (string $l): bool => str_starts_with($l, '|G125|'));
        $campos = explode('|', $g125);
        $this->assertSame('T1', $campos[2]);        // COD_IND_BEM = tombo
        $this->assertSame('SI', $campos[4]);         // TIPO_MOV
        $this->assertSame('1', $campos[9]);          // NUM_PARC
        $this->assertSame('1000,00', $campos[10]);   // VL_PARC_PASS = 1/48, sem fator

        // G110: ICMS_APROP ja com o fator 0,5 -> 500,00
        $g110 = collect($out['linhas'])->first(fn (string $l): bool => str_starts_with($l, '|G110|'));
        $this->assertStringContainsString('|500,00|', $g110);
    }

    public function test_g130_g140_so_saem_com_dados_da_nota_fiscal(): void
    {
        $bem = $this->bem(valorCredito: 48000, dataCredito: '2026-01-01', tombo: 'T1');

        $out = app(SpedBlocoGService::class)->gerar($this->empresa, '2026-01-01', [
            'documentos' => [
                $bem->id => [
                    'ind_emit' => '1', 'cod_part' => 'FORN1', 'cod_mod' => '55',
                    'serie' => '1', 'num_doc' => '12345', 'chv_nfe' => str_repeat('9', 44),
                    'num_item' => '1', 'cod_item' => 'T1',
                ],
            ],
        ]);

        $regs = array_map(static fn (string $l): string => explode('|', $l)[1], $out['linhas']);
        $this->assertSame(['G001', 'G110', 'G125', 'G130', 'G140', 'G990'], $regs);
    }

    public function test_bem_sem_nota_vira_pendencia_nomeada(): void
    {
        $this->bem(valorCredito: 48000, dataCredito: '2026-01-01', tombo: 'T1');

        $out = app(SpedBlocoGService::class)->gerar($this->empresa, '2026-01-01');

        $this->assertNotEmpty($out['pendencias']);
        $this->assertTrue(
            collect($out['pendencias'])->contains(fn (string $p): bool => str_contains($p, 'T1') && str_contains($p, 'G130')),
            'A pendencia de NF deve nomear o bem sem documento.',
        );
    }

    public function test_sem_bem_com_credito_bloco_fica_vazio(): void
    {
        $this->bem(valorCredito: null, dataCredito: null, tombo: 'T1');

        $out = app(SpedBlocoGService::class)->gerar($this->empresa, '2026-01-01');

        $this->assertSame(0, $out['bens']);
        $this->assertSame('|G001|1|', $out['linhas'][0]); // IND_MOV = 1 (bloco sem dados)
        $regs = array_map(static fn (string $l): string => explode('|', $l)[1], $out['linhas']);
        $this->assertSame(['G001', 'G990'], $regs);
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
