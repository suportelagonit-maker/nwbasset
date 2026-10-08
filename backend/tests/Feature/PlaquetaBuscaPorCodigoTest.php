<?php

namespace Tests\Feature;

use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * O leitor de codigo de barras das telas de campo procura a plaqueta pelo
 * conteudo lido na etiqueta. A busca precisa aceitar o numero, o codigo de
 * barras e o link do QR Code, sempre dentro da empresa ativa.
 */
class PlaquetaBuscaPorCodigoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_busca_aceita_numero_codigo_de_barras_e_link_do_qr_code(): void
    {
        $empresa = $this->criarEmpresa('A', '1');
        $plaqueta = $this->criarPlaqueta($empresa, '000777');
        $this->criarPlaqueta($empresa, '000888');

        $this->actingAsComTermo($this->criarUsuario($empresa));

        foreach ([
            $plaqueta->numero_plaqueta,
            $plaqueta->codigo_barras_conteudo,
            $plaqueta->link_consulta,
            ' '.$plaqueta->codigo_barras_conteudo.' ',
        ] as $codigoLido) {
            $response = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
                ->getJson('/api/v1/plaquetas?codigo='.urlencode($codigoLido));

            $response->assertOk();
            $response->assertJsonCount(1, 'data');
            $response->assertJsonPath('data.0.id', $plaqueta->id);
        }
    }

    public function test_busca_nao_alcanca_plaqueta_de_outra_empresa(): void
    {
        $empresaA = $this->criarEmpresa('A', '1');
        $empresaB = $this->criarEmpresa('B', '2');
        $plaquetaB = $this->criarPlaqueta($empresaB, '000999');

        $this->actingAsComTermo($this->criarUsuario($empresaA));

        $response = $this->withHeader('X-Empresa-Id', (string) $empresaA->id)
            ->getJson('/api/v1/plaquetas?codigo='.urlencode($plaquetaB->codigo_barras_conteudo));

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    public function test_busca_sem_resultado_devolve_lista_vazia(): void
    {
        $empresa = $this->criarEmpresa('A', '1');
        $this->criarPlaqueta($empresa, '000777');

        $this->actingAsComTermo($this->criarUsuario($empresa));

        $response = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/plaquetas?codigo=NAO-EXISTE');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    private function criarEmpresa(string $sufixo, string $digito): Empresa
    {
        return Empresa::query()->create([
            'razao_social' => "Empresa {$sufixo} LTDA",
            'nome_fantasia' => "Empresa {$sufixo}",
            'cnpj' => str_pad($digito, 14, '0', STR_PAD_LEFT),
            'inscricao_estadual' => "IE{$sufixo}",
            'email' => "empresa{$sufixo}@teste.local",
            'telefone' => '11999999999',
            'status' => 'ativo',
        ]);
    }

    private function criarPlaqueta(Empresa $empresa, string $numero): PlaquetaPatrimonial
    {
        $codigo = "PAT-{$empresa->id}-{$numero}";

        return PlaquetaPatrimonial::query()->create([
            'empresa_id' => $empresa->id,
            'codigo_plaqueta' => $codigo,
            'numero_plaqueta' => $numero,
            'codigo_barras_conteudo' => $codigo,
            'link_consulta' => "https://nwbasset.local/patrimonio/consulta?codigo={$codigo}",
            'qr_code_conteudo' => "https://nwbasset.local/patrimonio/consulta?codigo={$codigo}",
            'status' => 'EM_ESTOQUE',
            'data_geracao' => '2026-01-01',
        ]);
    }

    private function criarUsuario(Empresa $empresa): Usuario
    {
        RolePermissao::query()->firstOrCreate([
            'role' => RoleEnum::ADMIN_EMPRESA->value,
            'permissao' => 'bens.visualizar',
        ]);

        $usuario = Usuario::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'Usuario Plaquetas',
            'email' => "usuario{$empresa->id}@teste.local",
            'password' => 'secret123',
            'role' => RoleEnum::ADMIN_EMPRESA->value,
            'ativo' => true,
        ]);

        $usuario->empresas()->attach($empresa->id, [
            'perfil' => RoleEnum::ADMIN_EMPRESA->value,
            'created_at' => now(),
        ]);

        return $usuario;
    }
}
