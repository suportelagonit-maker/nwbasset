<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Inventory\Enums\ResultadoLeituraEnum;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Inventory\Models\InventarioItem;
use App\Domain\Inventory\Models\InventarioLeitura;
use App\Domain\Inventory\Services\InventarioService;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/** A contagem de inventário em campo, como o operador usa. */
class ContagemInventarioTest extends TestCase
{
    private Empresa $empresa;

    private Filial $filial;

    private UnidadeAdministrativa $unidade;

    private Departamento $departamento;

    private Local $almoxarifado;

    private Local $sala;

    private Usuario $operador;

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
        $this->almoxarifado = $this->local('Almoxarifado', 'LOC-1');
        $this->sala = $this->local('Sala de TI', 'LOC-2');

        foreach (['inventarios.visualizar', 'inventarios.criar', 'inventarios.atualizar', 'bens.visualizar'] as $permissao) {
            RolePermissao::query()->firstOrCreate([
                'role' => RoleEnum::OPERADOR_INVENTARIO->value,
                'permissao' => $permissao,
            ]);
        }

        $this->operador = Usuario::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'Operador de campo',
            'email' => 'operador@teste.local', 'password' => 'secret123',
            'role' => RoleEnum::OPERADOR_INVENTARIO->value, 'ativo' => true,
        ]);
        $this->operador->empresas()->attach($this->empresa->id, [
            'perfil' => RoleEnum::OPERADOR_INVENTARIO->value, 'created_at' => now(),
        ]);

        $this->actingAsComTermo($this->operador);
    }

    public function test_leitura_da_plaqueta_conta_o_bem(): void
    {
        $bem = $this->bem('TOMBO-1', $this->sala);
        $this->plaqueta($bem, '000001');
        $inventario = $this->inventario();

        $resposta = $this->contar($inventario, [
            ['codigo' => 'PAT-1-000001', 'local_id' => $this->sala->id, 'origem_id' => 'leitura-1'],
        ])->assertOk();

        $this->assertSame(ResultadoLeituraEnum::CONTADO->value, $resposta->json('data.leituras.0.resultado'));
        $this->assertSame('TOMBO-1', $resposta->json('data.leituras.0.bem.numero_tombo'));
        $this->assertSame(1, $resposta->json('data.resumo.encontrados'));
        $this->assertSame(0, $resposta->json('data.resumo.pendentes'));

        $item = InventarioItem::query()->where('bem_patrimonial_id', $bem->id)->first();
        $this->assertTrue((bool) $item->localizado);
        $this->assertSame($this->operador->id, $item->contado_por);
    }

    public function test_numero_do_tombo_digitado_tambem_conta(): void
    {
        $bem = $this->bem('TOMBO-7', $this->sala);
        $inventario = $this->inventario();

        $resposta = $this->contar($inventario, [['codigo' => 'TOMBO-7', 'origem_id' => 'l1']])->assertOk();

        $this->assertSame(ResultadoLeituraEnum::CONTADO->value, $resposta->json('data.leituras.0.resultado'));
        $this->assertSame($bem->id, $resposta->json('data.leituras.0.bem.id'));
    }

    public function test_reenviar_a_mesma_fila_nao_conta_duas_vezes(): void
    {
        $bem = $this->bem('TOMBO-1', $this->sala);
        $this->plaqueta($bem, '000001');
        $inventario = $this->inventario();

        $fila = [['codigo' => 'PAT-1-000001', 'local_id' => $this->sala->id, 'origem_id' => 'aparelho-abc-1']];

        $this->contar($inventario, $fila)->assertOk();
        $segunda = $this->contar($inventario, $fila)->assertOk();

        $this->assertSame('Leitura já registrada antes.', $segunda->json('data.leituras.0.mensagem'));
        $this->assertSame(1, InventarioLeitura::query()->count());
        $this->assertSame(1, $segunda->json('data.resumo.encontrados'));
    }

    public function test_ler_o_mesmo_bem_de_novo_avisa_que_ja_foi_contado(): void
    {
        $bem = $this->bem('TOMBO-1', $this->sala);
        $this->plaqueta($bem, '000001');
        $inventario = $this->inventario();

        $this->contar($inventario, [['codigo' => 'PAT-1-000001', 'origem_id' => 'l1']])->assertOk();
        $segunda = $this->contar($inventario, [['codigo' => 'PAT-1-000001', 'origem_id' => 'l2']])->assertOk();

        $this->assertSame(ResultadoLeituraEnum::JA_CONTADO->value, $segunda->json('data.leituras.0.resultado'));
        $this->assertTrue($segunda->json('data.leituras.0.exige_atencao'));
    }

    public function test_bem_encontrado_em_outro_local_e_apontado(): void
    {
        $bem = $this->bem('TOMBO-1', $this->sala);
        $this->plaqueta($bem, '000001');
        $inventario = $this->inventario();

        // A etiqueta estava na Sala de TI, mas foi lida no Almoxarifado.
        $resposta = $this->contar($inventario, [
            ['codigo' => 'PAT-1-000001', 'local_id' => $this->almoxarifado->id, 'origem_id' => 'l1'],
        ])->assertOk();

        $this->assertSame(ResultadoLeituraEnum::LOCAL_DIFERENTE->value, $resposta->json('data.leituras.0.resultado'));
        $this->assertSame(1, $resposta->json('data.resumo.local_diferente'));
        // Mesmo fora do lugar, o bem foi encontrado.
        $this->assertSame(1, $resposta->json('data.resumo.encontrados'));
    }

    public function test_etiqueta_desconhecida_e_guardada_como_achado(): void
    {
        $this->bem('TOMBO-1', $this->sala);
        $inventario = $this->inventario();

        $resposta = $this->contar($inventario, [
            ['codigo' => 'ETIQUETA-QUE-NAO-EXISTE', 'local_id' => $this->sala->id, 'origem_id' => 'l1'],
        ])->assertOk();

        $this->assertSame(ResultadoLeituraEnum::NAO_IDENTIFICADO->value, $resposta->json('data.leituras.0.resultado'));
        $this->assertSame(1, $resposta->json('data.resumo.nao_identificadas'));
        $this->assertSame(1, InventarioLeitura::query()->where('resultado', 'NAO_IDENTIFICADO')->count());
    }

    public function test_inventario_de_filial_so_conta_os_bens_daquela_filial(): void
    {
        $this->bem('TOMBO-MATRIZ', $this->sala);

        $outraFilial = Filial::query()->create([
            'empresa_id' => $this->empresa->id, 'nome' => 'Unidade 2', 'codigo' => 'FIL-2',
            'cnpj' => str_pad('3', 14, '0', STR_PAD_LEFT), 'endereco' => 'Rua 2',
            'cidade' => 'Sao Paulo', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $unidade2 = UnidadeAdministrativa::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $outraFilial->id,
            'nome' => 'Unidade 2', 'codigo' => 'UNI-2', 'descricao' => 'u', 'status' => 'ativo',
        ]);
        $departamento2 = Departamento::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $outraFilial->id,
            'unidade_administrativa_id' => $unidade2->id,
            'nome' => 'Dep 2', 'codigo' => 'DEP-2', 'descricao' => 'd', 'status' => 'ativo',
        ]);
        $local2 = Local::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $outraFilial->id,
            'unidade_administrativa_id' => $unidade2->id, 'departamento_id' => $departamento2->id,
            'nome' => 'Deposito', 'codigo' => 'LOC-9', 'endereco' => 'Rua', 'descricao' => 'l', 'status' => 'ativo',
        ]);
        BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $outraFilial->id,
            'unidade_administrativa_id' => $unidade2->id, 'departamento_id' => $departamento2->id,
            'local_id' => $local2->id, 'numero_tombo' => 'TOMBO-OUTRA', 'descricao' => 'Bem da outra filial',
            'categoria' => 'Informatica', 'data_aquisicao' => '2026-01-01', 'valor_aquisicao' => 1000,
            'valor_residual' => 0, 'status_bem' => 'ativo', 'estado_conservacao' => 'bom',
        ]);

        $inventario = $this->inventario();

        $this->assertSame(1, InventarioItem::query()->where('inventario_id', $inventario->id)->count());
    }

    public function test_bem_baixado_fica_fora_da_contagem(): void
    {
        $this->bem('TOMBO-1', $this->sala);
        $baixado = $this->bem('TOMBO-2', $this->sala);
        $baixado->update(['status_bem' => 'baixado']);

        $inventario = $this->inventario();

        $this->assertSame(1, InventarioItem::query()->where('inventario_id', $inventario->id)->count());
    }

    public function test_finalizar_gera_conciliacao_com_as_divergencias(): void
    {
        $encontrado = $this->bem('TOMBO-1', $this->sala);
        $this->plaqueta($encontrado, '000001');
        $foraDoLugar = $this->bem('TOMBO-2', $this->sala);
        $this->plaqueta($foraDoLugar, '000002');
        $this->bem('TOMBO-3', $this->sala);

        $inventario = $this->inventario();

        $this->contar($inventario, [
            ['codigo' => 'PAT-1-000001', 'local_id' => $this->sala->id, 'origem_id' => 'l1'],
            ['codigo' => 'PAT-1-000002', 'local_id' => $this->almoxarifado->id, 'origem_id' => 'l2'],
        ])->assertOk();

        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/inventarios/{$inventario->id}/finalizar")
            ->assertOk();

        $this->assertSame(3, $resposta->json('data.total_bens_sistema'));
        $this->assertSame(2, $resposta->json('data.total_bens_encontrados'));
        // Um nao encontrado + um em local diferente.
        $this->assertSame(2, $resposta->json('data.divergencias'));
    }

    public function test_contagem_de_inventario_finalizado_e_recusada(): void
    {
        $bem = $this->bem('TOMBO-1', $this->sala);
        $this->plaqueta($bem, '000001');
        $inventario = $this->inventario();
        $inventario->update(['status' => 'FINALIZADO']);

        $this->contar($inventario, [['codigo' => 'PAT-1-000001', 'origem_id' => 'l1']])
            ->assertStatus(422);
    }

    public function test_tela_de_contagem_traz_progresso_e_pendentes(): void
    {
        $bem = $this->bem('TOMBO-1', $this->sala);
        $this->plaqueta($bem, '000001');
        $this->bem('TOMBO-2', $this->almoxarifado);
        $inventario = $this->inventario();

        $this->contar($inventario, [['codigo' => 'PAT-1-000001', 'origem_id' => 'l1']])->assertOk();

        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/inventarios/{$inventario->id}/contagem")
            ->assertOk();

        $this->assertSame(2, $resposta->json('data.resumo.total'));
        $this->assertSame(1, $resposta->json('data.resumo.encontrados'));
        $this->assertEquals(50, $resposta->json('data.resumo.percentual'));
        $this->assertCount(1, $resposta->json('data.pendentes'));
        $this->assertSame('TOMBO-2', $resposta->json('data.pendentes.0.numero_tombo'));
    }

    public function test_inventario_de_outra_empresa_nao_e_alcancado(): void
    {
        $outra = Empresa::query()->create([
            'razao_social' => 'Outra LTDA', 'nome_fantasia' => 'Outra',
            'cnpj' => str_pad('9', 14, '0', STR_PAD_LEFT), 'inscricao_estadual' => 'IE9',
            'email' => 'o@teste.local', 'telefone' => '11999999999', 'status' => 'ativo',
        ]);
        $filialAlheia = Filial::query()->create([
            'empresa_id' => $outra->id, 'nome' => 'Matriz', 'codigo' => 'FIL-9',
            'cnpj' => str_pad('8', 14, '0', STR_PAD_LEFT), 'endereco' => 'Rua 9',
            'cidade' => 'Sao Paulo', 'estado' => 'SP', 'status' => 'ativo',
        ]);
        $inventarioAlheio = Inventario::query()->create([
            'empresa_id' => $outra->id, 'filial_id' => $filialAlheia->id,
            'nome' => 'Inventario da outra', 'data_inicio' => '2026-01-01', 'status' => 'ABERTO',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/inventarios/{$inventarioAlheio->id}/contagem")
            ->assertNotFound();
    }

    public function test_inventario_rotativo_conta_so_os_locais_escolhidos(): void
    {
        $this->bem('TOMBO-SALA', $this->sala);
        $this->bem('TOMBO-ALMOX', $this->almoxarifado);

        $rotativo = app(InventarioService::class)->criarInventario([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->filial->id,
            'nome' => 'Rotativo da Sala de TI',
            'data_inicio' => '2026-01-01',
            'locais' => [$this->sala->id],
        ]);

        $this->assertSame('ROTATIVO', $rotativo->tipo);
        $this->assertSame(1, InventarioItem::query()->where('inventario_id', $rotativo->id)->count());

        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/inventarios/{$rotativo->id}/contagem")
            ->assertOk();

        $this->assertSame('TOMBO-SALA', $resposta->json('data.pendentes.0.numero_tombo'));
        $this->assertSame(['Sala de TI'], $resposta->json('data.inventario.locais'));
    }

    public function test_inventario_sem_locais_continua_completo(): void
    {
        $this->bem('TOMBO-SALA', $this->sala);
        $this->bem('TOMBO-ALMOX', $this->almoxarifado);

        $inventario = $this->inventario();

        $this->assertSame('COMPLETO', $inventario->tipo);
        $this->assertSame(2, InventarioItem::query()->where('inventario_id', $inventario->id)->count());
    }

    public function test_responsavel_diferente_e_apontado_na_leitura(): void
    {
        $cadastrado = $this->responsavel('Maria do Patrimonio', 'MAT-1', '11111111111');
        $outro = $this->responsavel('Joao da Operacao', 'MAT-2', '22222222222');

        $bem = $this->bem('TOMBO-1', $this->sala);
        $bem->update(['responsavel_id' => $cadastrado->id]);
        $this->plaqueta($bem, '000001');

        $inventario = $this->inventario();

        $resposta = $this->contar($inventario, [[
            'codigo' => 'PAT-1-000001',
            'local_id' => $this->sala->id,
            'responsavel_id' => $outro->id,
            'origem_id' => 'l1',
        ]])->assertOk();

        $this->assertSame(
            ResultadoLeituraEnum::RESPONSAVEL_DIFERENTE->value,
            $resposta->json('data.leituras.0.resultado'),
        );
        $this->assertSame(1, $resposta->json('data.resumo.responsavel_diferente'));
        // Mesmo com outro responsavel, o bem foi encontrado.
        $this->assertSame(1, $resposta->json('data.resumo.encontrados'));
    }

    public function test_conciliacao_aponta_local_e_responsavel_divergentes(): void
    {
        $cadastrado = $this->responsavel('Maria do Patrimonio', 'MAT-1', '11111111111');
        $outro = $this->responsavel('Joao da Operacao', 'MAT-2', '22222222222');

        $bem = $this->bem('TOMBO-1', $this->sala);
        $bem->update(['responsavel_id' => $cadastrado->id]);
        $this->plaqueta($bem, '000001');

        $inventario = $this->inventario();

        $this->contar($inventario, [[
            'codigo' => 'PAT-1-000001',
            'local_id' => $this->almoxarifado->id,
            'responsavel_id' => $outro->id,
            'origem_id' => 'l1',
        ]])->assertOk();

        $resposta = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/inventarios/{$inventario->id}/finalizar")
            ->assertOk();

        // Uma divergencia de local e uma de responsavel, para o mesmo bem.
        $this->assertSame(2, $resposta->json('data.divergencias'));
    }

    public function test_pendentes_vem_paginados(): void
    {
        foreach (range(1, 7) as $numero) {
            $this->bem('TOMBO-'.$numero, $this->sala);
        }

        $inventario = $this->inventario();

        $primeira = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/inventarios/{$inventario->id}/contagem?por_pagina=20&pagina=1")
            ->assertOk();

        $this->assertSame(7, $primeira->json('data.paginacao.total'));
        $this->assertCount(7, $primeira->json('data.pendentes'));

        $segunda = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/inventarios/{$inventario->id}/contagem?por_pagina=20&pagina=2")
            ->assertOk();

        $this->assertSame(2, $segunda->json('data.paginacao.pagina'));
        $this->assertCount(0, $segunda->json('data.pendentes'));
    }

    private function responsavel(string $nome, string $matricula, string $cpf)
    {
        return \App\Domain\Organization\Models\Responsavel::query()->create([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->filial->id,
            'departamento_id' => $this->departamento->id,
            'nome' => $nome,
            'matricula' => $matricula,
            'cpf' => $cpf,
            'email' => strtolower(str_replace(' ', '.', $nome)).'@teste.local',
            'telefone' => '11988888888',
            'cargo' => 'Analista',
            'status' => 'ativo',
        ]);
    }

    private function contar(Inventario $inventario, array $leituras)
    {
        return $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/inventarios/{$inventario->id}/leituras", ['leituras' => $leituras]);
    }

    private function inventario(): Inventario
    {
        return app(InventarioService::class)->criarInventario([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->filial->id,
            'nome' => 'Inventário 2026',
            'data_inicio' => '2026-01-01',
        ]);
    }

    private function local(string $nome, string $codigo): Local
    {
        return Local::query()->create([
            'empresa_id' => $this->empresa->id, 'filial_id' => $this->filial->id,
            'unidade_administrativa_id' => $this->unidade->id, 'departamento_id' => $this->departamento->id,
            'nome' => $nome, 'codigo' => $codigo, 'endereco' => 'Rua', 'descricao' => $nome, 'status' => 'ativo',
        ]);
    }

    private function bem(string $tombo, Local $local): BemPatrimonial
    {
        return BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->filial->id,
            'unidade_administrativa_id' => $this->unidade->id,
            'departamento_id' => $this->departamento->id,
            'local_id' => $local->id,
            'numero_tombo' => $tombo,
            'descricao' => 'Bem '.$tombo,
            'categoria' => 'Informatica',
            'data_aquisicao' => '2026-01-01',
            'valor_aquisicao' => 1000,
            'valor_residual' => 0,
            'status_bem' => 'ativo',
            'estado_conservacao' => 'bom',
        ]);
    }

    private function plaqueta(BemPatrimonial $bem, string $numero): PlaquetaPatrimonial
    {
        $codigo = 'PAT-1-'.$numero;

        return PlaquetaPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id,
            'filial_id' => $this->filial->id,
            'bem_patrimonial_id' => $bem->id,
            'codigo_plaqueta' => $codigo,
            'numero_plaqueta' => $numero,
            'codigo_barras_conteudo' => $codigo,
            'link_consulta' => 'https://nwbasset.local/patrimonio/consulta?codigo='.$codigo,
            'qr_code_conteudo' => 'https://nwbasset.local/patrimonio/consulta?codigo='.$codigo,
            'status' => 'APLICADA',
            'data_geracao' => '2026-01-01',
        ]);
    }
}
