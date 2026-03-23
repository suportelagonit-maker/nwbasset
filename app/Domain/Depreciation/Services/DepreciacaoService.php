<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacao;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DepreciacaoService
{
    public function calcularDepreciacaoAnual(float $valorAquisicao, float $valorResidual, int $vidaUtilAnos): float
    {
        $this->validarVidaUtil($vidaUtilAnos);

        $valorDepreciavel = max(0, $valorAquisicao - $valorResidual);

        return round($valorDepreciavel / $vidaUtilAnos, 2);
    }

    public function calcularValorContabil(float $valorAquisicao, float $valorDepreciadoAcumulado): float
    {
        return round(max(0, $valorAquisicao - $valorDepreciadoAcumulado), 2);
    }

    public function registrarDepreciacao(array $data): DepreciacaoBem
    {
        return DB::transaction(function () use ($data): DepreciacaoBem {
            $bem = BemPatrimonial::query()->findOrFail($data['bem_patrimonial_id']);
            $metodo = $this->resolverMetodoDepreciacao($data['metodo_depreciacao_id'] ?? null);

            $payload = $this->montarPayloadDepreciacao($bem, $metodo, $data);

            $existe = DepreciacaoBem::query()
                ->where('bem_patrimonial_id', $payload['bem_patrimonial_id'])
                ->whereDate('data_calculo', $payload['data_calculo'])
                ->exists();

            if ($existe) {
                throw ValidationException::withMessages([
                    'data_calculo' => 'Ja existe depreciacao registrada para o bem na data informada.',
                ]);
            }

            $depreciacao = DepreciacaoBem::query()->create($payload);

            app(LogOperacaoPatrimonialService::class)->registrar(
                'DEPRECIACAO_BEM',
                $depreciacao,
                $depreciacao->empresa_id,
                [],
                $depreciacao->toArray(),
            );

            return $depreciacao;
        });
    }

    public function atualizarDepreciacao(DepreciacaoBem $depreciacao, array $data): DepreciacaoBem
    {
        return DB::transaction(function () use ($depreciacao, $data): DepreciacaoBem {
            $bem = BemPatrimonial::query()->findOrFail($data['bem_patrimonial_id'] ?? $depreciacao->bem_patrimonial_id);
            $metodo = $this->resolverMetodoDepreciacao($data['metodo_depreciacao_id'] ?? $depreciacao->metodo_depreciacao_id);

            $payload = $this->montarPayloadDepreciacao($bem, $metodo, [
                'empresa_id' => $data['empresa_id'] ?? $depreciacao->empresa_id,
                'valor_aquisicao' => $data['valor_aquisicao'] ?? $depreciacao->valor_aquisicao,
                'valor_residual' => $data['valor_residual'] ?? $depreciacao->valor_residual,
                'vida_util_anos' => $data['vida_util_anos'] ?? $depreciacao->vida_util_anos,
                'data_calculo' => $data['data_calculo'] ?? $depreciacao->data_calculo?->toDateString(),
                'metodo_depreciacao_id' => $metodo->id,
                'bem_patrimonial_id' => $bem->id,
            ]);

            $existe = DepreciacaoBem::query()
                ->where('bem_patrimonial_id', $payload['bem_patrimonial_id'])
                ->whereDate('data_calculo', $payload['data_calculo'])
                ->where('id', '!=', $depreciacao->id)
                ->exists();

            if ($existe) {
                throw ValidationException::withMessages([
                    'data_calculo' => 'Ja existe depreciacao registrada para o bem na data informada.',
                ]);
            }

            $depreciacao->update($payload);

            return $depreciacao->fresh();
        });
    }

    protected function montarPayloadDepreciacao(BemPatrimonial $bem, MetodoDepreciacao $metodo, array $data): array
    {
        $empresaId = (int) ($data['empresa_id'] ?? $bem->empresa_id);

        if ($empresaId !== (int) $bem->empresa_id) {
            throw ValidationException::withMessages([
                'empresa_id' => 'O bem informado nao pertence a empresa enviada.',
            ]);
        }

        $valorAquisicao = (float) ($data['valor_aquisicao'] ?? $bem->valor_aquisicao ?? 0);
        $valorResidual = (float) ($data['valor_residual'] ?? $bem->valor_residual ?? 0);
        $vidaUtilAnos = (int) ($data['vida_util_anos'] ?? $bem->vida_util_anos ?? $this->resolverVidaUtilPadrao($empresaId, $metodo->id));
        $dataCalculo = Carbon::parse($data['data_calculo'] ?? now())->toDateString();

        if ($bem->data_aquisicao && Carbon::parse($dataCalculo)->lt($bem->data_aquisicao)) {
            throw ValidationException::withMessages([
                'data_calculo' => 'A data de calculo nao pode ser anterior a data de aquisicao do bem.',
            ]);
        }

        $depreciacaoAnual = $this->calcularDepreciacaoAnual($valorAquisicao, $valorResidual, $vidaUtilAnos);
        $taxaAnual = round(100 / $vidaUtilAnos, 4);
        $anosDepreciados = $this->calcularAnosDepreciados($bem, $dataCalculo, $vidaUtilAnos);
        $valorDepreciavel = max(0, round($valorAquisicao - $valorResidual, 2));
        $valorDepreciadoAcumulado = min($valorDepreciavel, round($depreciacaoAnual * $anosDepreciados, 2));
        $valorContabil = max(round($valorResidual, 2), $this->calcularValorContabil($valorAquisicao, $valorDepreciadoAcumulado));

        return [
            'bem_patrimonial_id' => $bem->id,
            'empresa_id' => $empresaId,
            'metodo_depreciacao_id' => $metodo->id,
            'valor_aquisicao' => round($valorAquisicao, 2),
            'valor_residual' => round($valorResidual, 2),
            'vida_util_anos' => $vidaUtilAnos,
            'taxa_anual' => $taxaAnual,
            'valor_depreciado_acumulado' => $valorDepreciadoAcumulado,
            'valor_contabil' => $valorContabil,
            'data_calculo' => $dataCalculo,
        ];
    }

    protected function resolverMetodoDepreciacao(?int $metodoDepreciacaoId): MetodoDepreciacao
    {
        if ($metodoDepreciacaoId !== null) {
            return MetodoDepreciacao::query()->findOrFail($metodoDepreciacaoId);
        }

        return MetodoDepreciacao::query()
            ->where('codigo', 'LINHA_RETA')
            ->firstOrFail();
    }

    protected function resolverVidaUtilPadrao(int $empresaId, int $metodoDepreciacaoId): int
    {
        $parametro = ParametroDepreciacao::query()
            ->where('empresa_id', $empresaId)
            ->where('metodo_depreciacao_id', $metodoDepreciacaoId)
            ->first();

        if (! $parametro) {
            throw ValidationException::withMessages([
                'vida_util_anos' => 'Vida util nao informada e nenhum parametro padrao foi encontrado para a empresa.',
            ]);
        }

        return (int) $parametro->vida_util_padrao;
    }

    protected function calcularAnosDepreciados(BemPatrimonial $bem, string $dataCalculo, int $vidaUtilAnos): int
    {
        if (! $bem->data_aquisicao) {
            return 1;
        }

        $inicio = $bem->data_aquisicao->copy()->startOfYear();
        $fim = Carbon::parse($dataCalculo)->startOfYear();
        $anos = $inicio->diffInYears($fim) + 1;

        return max(1, min($vidaUtilAnos, $anos));
    }

    protected function validarVidaUtil(int $vidaUtilAnos): void
    {
        if ($vidaUtilAnos <= 0) {
            throw ValidationException::withMessages([
                'vida_util_anos' => 'A vida util deve ser maior que zero.',
            ]);
        }
    }
}
