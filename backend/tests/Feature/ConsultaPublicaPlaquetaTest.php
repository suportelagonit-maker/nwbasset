<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * Consulta publica de plaqueta: util para identificar o bem, mas sem expor
 * dado pessoal de quem e responsavel por ele.
 */
class ConsultaPublicaPlaquetaTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_consulta_publica_identifica_o_bem_sem_autenticacao(): void
    {
        ['plaqueta' => $plaqueta] = $this->cenario();

        $resposta = $this->getJson('/api/v1/public/plaquetas/lookup?codigo='.$plaqueta->codigo_barras_conteudo)
            ->assertOk();

        // O que a consulta publica deve mostrar: o bem e onde ele fica.
        $resposta->assertJsonPath('data.bem.numero_tombo', 'TOMBO-1');
        $resposta->assertJsonPath('data.empresa.nome_fantasia', 'Cliente');
        $resposta->assertJsonPath('data.local.nome', 'Sala de TI');
    }

    public function test_consulta_publica_nao_expoe_o_responsavel(): void
    {
        ['plaqueta' => $plaqueta] = $this->cenario();

        $resposta = $this->getJson('/api/v1/public/plaquetas/lookup?codigo='.$plaqueta->codigo_barras_conteudo)
            ->assertOk();

        // Nome e matricula do responsavel sao dados pessoais e NAO podem
        // aparecer numa rota anonima e enumeravel.
        $resposta->assertJsonMissingPath('data.responsavel');
        $corpo = $resposta->getContent();
        $this->assertStringNotContainsString('Maria do Patrimonio', $corpo);
        $this->assertStringNotContainsString('MAT-001', $corpo);
    }

    public function test_consulta_publica_tem_rate_limit(): void
    {
        ['plaqueta' => $plaqueta] = $this->cenario();
        $url = '/api/v1/public/plaquetas/lookup?codigo='.$plaqueta->codigo_barras_conteudo;

        // O limite e 20/min por IP; a 21a tem de ser barrada.
        for ($i = 0; $i < 20; $i++) {
            $this->getJson($url)->assertOk();
        }

        $this->getJson($url)->assertStatus(429);
    }

    /** @return array{plaqueta: PlaquetaPatrimonial} */
    private function cenario(): array
    {
        $empresa = Empresa::query()->create([
            'razao_social' => 'Cliente LTDA', 'nome_fantasia' => 'Cliente',
            'cnpj' => str_pad('1', 14, '0', STR_PAD_LEFT), 'inscricao_estadual' => 'IE1',
            'email' => 'c@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $filial = Filial::query()->create([
            'empresa_id' => $empresa->id, 'nome' => 'Matriz', 'codigo' => 'FIL-1',
            'cnpj' => str_pad('2', 14, '0', STR_PAD_LEFT), 'endereco' => 'Rua 1',
            'cidade' => 'Sao Paulo', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $unidade = UnidadeAdministrativa::query()->create([
            'empresa_id' => $empresa->id, 'filial_id' => $filial->id,
            'nome' => 'Unidade', 'codigo' => 'UNI-1', 'descricao' => 'u', 'status' => 'ativo',
        ]);
        $departamento = Departamento::query()->create([
            'empresa_id' => $empresa->id, 'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id,
            'nome' => 'Dep', 'codigo' => 'DEP-1', 'descricao' => 'd', 'status' => 'ativo',
        ]);
        $local = Local::query()->create([
            'empresa_id' => $empresa->id, 'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id, 'departamento_id' => $departamento->id,
            'nome' => 'Sala de TI', 'codigo' => 'LOC-1', 'endereco' => 'Rua', 'descricao' => 'l', 'status' => 'ativo',
        ]);
        $responsavel = Responsavel::query()->create([
            'empresa_id' => $empresa->id, 'filial_id' => $filial->id, 'departamento_id' => $departamento->id,
            'nome' => 'Maria do Patrimonio', 'matricula' => 'MAT-001', 'cpf' => '11111111111',
            'email' => 'maria@teste.local', 'telefone' => '11988888888', 'cargo' => 'Gestora', 'status' => 'ativo',
        ]);
        $bem = BemPatrimonial::query()->create([
            'empresa_id' => $empresa->id, 'filial_id' => $filial->id,
            'unidade_administrativa_id' => $unidade->id, 'departamento_id' => $departamento->id,
            'local_id' => $local->id, 'responsavel_id' => $responsavel->id,
            'numero_tombo' => 'TOMBO-1', 'descricao' => 'Notebook', 'categoria' => 'Informatica',
            'data_aquisicao' => '2026-01-01', 'valor_aquisicao' => 1000, 'valor_residual' => 0,
            'status_bem' => 'ativo', 'estado_conservacao' => 'bom',
        ]);
        $plaqueta = PlaquetaPatrimonial::query()->create([
            'empresa_id' => $empresa->id, 'filial_id' => $filial->id, 'bem_patrimonial_id' => $bem->id,
            'codigo_plaqueta' => 'PAT-1-0001', 'numero_plaqueta' => '0001', 'codigo_barras_conteudo' => 'PAT-1-0001',
            'link_consulta' => 'https://x/consulta?codigo=PAT-1-0001', 'qr_code_conteudo' => 'https://x/consulta?codigo=PAT-1-0001',
            'status' => 'APLICADA', 'data_geracao' => '2026-01-01',
        ]);

        return ['plaqueta' => $plaqueta];
    }
}
