<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\Depreciation\Enums\BaseRegraDepreciacaoEnum;
use App\Domain\Depreciation\Enums\MetodoDepreciacaoRegraEnum;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use App\Domain\Depreciation\Support\TabelaReceitaFederal;
use App\Domain\AssetRegistry\Models\TipoProduto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Carrega a tabela da Receita Federal como configuracao inicial da empresa.
 *
 * O sistema precisa chegar util no primeiro dia: antes, uma empresa nova
 * ficava sem nenhuma regra e todo bem caia num padrao unico de 5 anos/20%,
 * ou nem depreciava (dava erro). Agora nasce com as taxas do Anexo III da
 * IN RFB 1.700/2017, nas duas bases, prontas para editar.
 *
 * Nada aqui sobrescreve regra existente: quem ja ajustou uma taxa nao perde
 * o ajuste quando a tabela e reaplicada.
 */
class TabelaPadraoDepreciacaoService
{
    /**
     * @return array<string, int>
     */
    public function aplicarNaEmpresa(int $empresaId, ?int $usuarioId = null, bool $sobrescrever = false): array
    {
        return DB::transaction(function () use ($empresaId, $usuarioId, $sobrescrever): array {
            $metodoId = MetodoDepreciacao::query()->firstOrCreate(
                ['codigo' => 'LINHA_RETA'],
                ['nome' => 'Linha Reta', 'descricao' => 'Quota constante ao longo da vida util.'],
            )->id;

            $criadas = 0;
            $mantidas = 0;

            foreach (TabelaReceitaFederal::tiposDeBem() as $linha) {
                $tipoBemId = $this->garantirTipoBem($empresaId, $linha['tipo_bem']);

                foreach ($this->bases() as $base) {
                    $resultado = $this->gravarRegra($empresaId, $base, $metodoId, $usuarioId, $sobrescrever, [
                        'tipo_bem' => $linha['tipo_bem'],
                        'tipo_bem_id' => $tipoBemId,
                        'tipo_produto_id' => null,
                        'nome_regra' => $linha['tipo_bem'],
                        'vida_util_anos' => $linha['vida_util_anos'],
                        'taxa' => $linha['taxa'],
                        'depreciavel' => $linha['depreciavel'],
                        'observacoes' => $linha['observacao'],
                    ]);

                    $resultado ? $criadas++ : $mantidas++;
                }
            }

            foreach (TabelaReceitaFederal::produtos() as $linha) {
                $tipoBemId = $this->garantirTipoBem($empresaId, $linha['tipo_bem']);
                $tipoProdutoId = $this->localizarProduto($empresaId, $tipoBemId, $linha['produto']);

                if ($tipoProdutoId === null) {
                    continue;
                }

                foreach ($this->bases() as $base) {
                    $resultado = $this->gravarRegra($empresaId, $base, $metodoId, $usuarioId, $sobrescrever, [
                        'tipo_bem' => $linha['tipo_bem'],
                        'tipo_bem_id' => $tipoBemId,
                        'tipo_produto_id' => $tipoProdutoId,
                        'nome_regra' => $linha['tipo_bem'].' / '.$linha['produto'],
                        'vida_util_anos' => $linha['vida_util_anos'],
                        'taxa' => $linha['taxa'],
                        'depreciavel' => true,
                        'observacoes' => $linha['observacao'],
                    ]);

                    $resultado ? $criadas++ : $mantidas++;
                }
            }

            return ['criadas' => $criadas, 'mantidas' => $mantidas];
        });
    }

    /** @return array<int, string> */
    private function bases(): array
    {
        return [
            BaseRegraDepreciacaoEnum::FISCAL->value,
            BaseRegraDepreciacaoEnum::CONTABIL->value,
        ];
    }

    /** @param array<string, mixed> $dados */
    private function gravarRegra(
        int $empresaId,
        string $base,
        int $metodoId,
        ?int $usuarioId,
        bool $sobrescrever,
        array $dados,
    ): bool {
        $chave = [
            'empresa_id' => $empresaId,
            'base_regra' => $base,
            'tipo_bem' => $dados['tipo_bem'],
            'tipo_produto_id' => $dados['tipo_produto_id'],
        ];

        $existente = RegraDepreciacaoTipoBem::query()->where($chave)->first();

        if ($existente && ! $sobrescrever) {
            return false;
        }

        $valores = [
            'tipo_bem_id' => $dados['tipo_bem_id'],
            'nome_regra' => $dados['nome_regra'],
            'metodo_depreciacao_id' => $metodoId,
            'metodo_depreciacao' => MetodoDepreciacaoRegraEnum::LINHA_RETA->value,
            'vida_util_anos' => $dados['vida_util_anos'],
            'taxa_anual' => $dados['taxa'],
            'taxa_anual_percentual' => $dados['taxa'],
            'valor_residual_percentual' => 0,
            'coeficiente_aceleracao' => 1,
            'depreciavel' => $dados['depreciavel'],
            'requer_override_manual' => false,
            'data_inicio_vigencia' => $existente?->data_inicio_vigencia ?? now()->startOfYear()->toDateString(),
            'data_fim_vigencia' => null,
            'ativo' => true,
            'observacoes' => $dados['observacoes'],
            'atualizado_por' => $usuarioId,
        ];

        if ($existente) {
            $existente->forceFill($valores)->save();

            return true;
        }

        RegraDepreciacaoTipoBem::query()->create($chave + $valores + ['criado_por' => $usuarioId]);

        return true;
    }

    private function garantirTipoBem(int $empresaId, string $nome): int
    {
        $existente = TipoBemPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->get()
            ->first(fn (TipoBemPatrimonial $tipo): bool => $this->normalizar($tipo->nome) === $this->normalizar($nome));

        if ($existente) {
            return (int) $existente->id;
        }

        return (int) TipoBemPatrimonial::query()->create([
            'empresa_id' => $empresaId,
            'nome' => $nome,
        ])->id;
    }

    private function localizarProduto(int $empresaId, int $tipoBemId, string $nome): ?int
    {
        $produto = TipoProduto::query()
            ->where('empresa_id', $empresaId)
            ->get()
            ->first(fn (TipoProduto $item): bool => $this->normalizar($item->nome) === $this->normalizar($nome));

        if ($produto === null) {
            return null;
        }

        // Produto cadastrado sem tipo de bem: aproveita para amarrar.
        if ($produto->tipo_bem_id === null) {
            $produto->forceFill(['tipo_bem_id' => $tipoBemId])->save();
        }

        return (int) $produto->id;
    }

    private function normalizar(?string $texto): string
    {
        return (string) preg_replace('/[^a-z0-9]+/', '', Str::ascii(Str::lower(trim((string) $texto))));
    }
}
