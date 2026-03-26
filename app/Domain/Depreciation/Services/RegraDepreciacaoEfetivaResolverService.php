<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Enums\BaseRegraDepreciacaoEnum;
use App\Domain\Depreciation\Enums\MetodoDepreciacaoRegraEnum;
use App\Domain\Depreciation\Enums\OrigemParametroDepreciacaoEnum;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacaoBem;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class RegraDepreciacaoEfetivaResolverService
{
    public function resolverRegraEfetivaParaBem(
        BemPatrimonial $bem,
        ?string $baseRegra = null,
        ?string $dataReferencia = null
    ): array {
        $base = $this->normalizarBaseRegra($baseRegra);
        $data = Carbon::parse($dataReferencia ?: now())->toDateString();

        $parametroBem = $this->buscarParametroBemAtivo($bem, $base, $data);

        if ($parametroBem) {
            return $this->mapearParametroBem($bem, $parametroBem);
        }

        $regraPadrao = $this->buscarRegraPadraoVigente($bem, $base, $data);

        if ($regraPadrao) {
            return $this->mapearRegraPadrao($bem, $regraPadrao);
        }

        return $this->resolverFallbackLegado($bem, $base, $data);
    }

    public function herdarRegraPadraoParaBem(
        BemPatrimonial $bem,
        ?string $baseRegra = null,
        ?int $usuarioId = null
    ): ?ParametroDepreciacaoBem {
        $base = $this->normalizarBaseRegra($baseRegra);
        $regraEfetiva = $this->resolverRegraEfetivaParaBem($bem, $base);

        $existente = ParametroDepreciacaoBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->where('base_regra_aplicada', $regraEfetiva['base_regra'])
            ->where('ativo', true)
            ->first();

        if ($existente && in_array($existente->origem_parametro, [
            OrigemParametroDepreciacaoEnum::MANUAL->value,
            OrigemParametroDepreciacaoEnum::IMPORTACAO->value,
            OrigemParametroDepreciacaoEnum::AJUSTE_TECNICO->value,
        ], true)) {
            return $existente;
        }

        return ParametroDepreciacaoBem::query()->updateOrCreate(
            [
                'bem_patrimonial_id' => $bem->id,
                'base_regra_aplicada' => $regraEfetiva['base_regra'],
                'ativo' => true,
            ],
            [
                'empresa_id' => $bem->empresa_id,
                'regra_depreciacao_id' => $regraEfetiva['regra_id'],
                'metodo_depreciacao' => $regraEfetiva['metodo'],
                'metodo_depreciacao_id' => $regraEfetiva['metodo_depreciacao_id'],
                'vida_util_anos' => $regraEfetiva['vida_util_anos'],
                'taxa_anual_percentual' => $regraEfetiva['taxa_anual_percentual'],
                'valor_residual_percentual' => $regraEfetiva['valor_residual_percentual'],
                'valor_residual_monetario' => null,
                'data_inicio_depreciacao' => $bem->data_aquisicao?->toDateString(),
                'depreciavel' => $regraEfetiva['depreciavel'],
                'motivo_override' => null,
                'origem_parametro' => $regraEfetiva['origem_da_regra'] === 'regra_padrao'
                    ? OrigemParametroDepreciacaoEnum::HERDADO_REGRA->value
                    : OrigemParametroDepreciacaoEnum::LEGADO->value,
                'criado_por' => $existente?->criado_por ?? $usuarioId,
                'atualizado_por' => $usuarioId,
            ],
        );
    }

    protected function buscarParametroBemAtivo(BemPatrimonial $bem, string $base, string $data): ?ParametroDepreciacaoBem
    {
        if (! Schema::hasTable('parametros_depreciacao_bens')) {
            return null;
        }

        return ParametroDepreciacaoBem::query()
            ->with(['regraDepreciacao.metodoDepreciacao', 'metodoDepreciacaoLegacy'])
            ->where('bem_patrimonial_id', $bem->id)
            ->where('ativo', true)
            ->where('base_regra_aplicada', $base)
            ->where(function ($query) use ($data): void {
                $query->whereNull('data_inicio_depreciacao')
                    ->orWhereDate('data_inicio_depreciacao', '<=', $data);
            })
            ->orderByDesc('id')
            ->first();
    }

    protected function buscarRegraPadraoVigente(BemPatrimonial $bem, string $base, string $data): ?RegraDepreciacaoTipoBem
    {
        $tipoBemNome = trim((string) $bem->categoria);
        $tipoBemId = null;

        if (Schema::hasTable('tipos_bens_patrimoniais') && $tipoBemNome !== '') {
            $tipoBemId = TipoBemPatrimonial::query()
                ->where('empresa_id', $bem->empresa_id)
                ->whereRaw('LOWER(nome) = ?', [mb_strtolower($tipoBemNome)])
                ->value('id');
        }

        $query = RegraDepreciacaoTipoBem::query()
            ->with('metodoDepreciacao')
            ->where('empresa_id', $bem->empresa_id)
            ->orderByDesc('data_inicio_vigencia')
            ->orderByDesc('id');

        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'base_regra')) {
            $query->where('base_regra', $base);
        }

        if ($this->tabelaPossuiColunas('regras_depreciacao_tipos_bens', ['ativo', 'data_inicio_vigencia', 'data_fim_vigencia'])) {
            $query->ativasVigentes($data);
        }

        $query->where(function ($inner) use ($tipoBemId, $tipoBemNome): void {
            if ($tipoBemId && Schema::hasColumn('regras_depreciacao_tipos_bens', 'tipo_bem_id')) {
                $inner->orWhere('tipo_bem_id', $tipoBemId);
            }

            if ($tipoBemNome !== '') {
                $inner->orWhereRaw('LOWER(tipo_bem) = ?', [mb_strtolower($tipoBemNome)]);
            }
        });

        $regra = $query->first();

        if ($regra) {
            return $regra;
        }

        if ($base !== BaseRegraDepreciacaoEnum::FISCAL->value) {
            return $this->buscarRegraPadraoVigente($bem, BaseRegraDepreciacaoEnum::FISCAL->value, $data);
        }

        return null;
    }

    protected function mapearParametroBem(BemPatrimonial $bem, ParametroDepreciacaoBem $parametro): array
    {
        $metodoId = (int) ($parametro->metodo_depreciacao_id ?? $parametro->regraDepreciacao?->metodo_depreciacao_id ?? 0);
        $metodoCodigo = trim((string) ($parametro->metodo_depreciacao ?: $parametro->regraDepreciacao?->metodo_depreciacao));

        if ($metodoCodigo === '' && $parametro->metodoDepreciacaoLegacy) {
            $metodoCodigo = $this->mapearCodigoMetodoLegado($parametro->metodoDepreciacaoLegacy->codigo);
        }

        return [
            'depreciavel' => (bool) $parametro->depreciavel,
            'base_regra' => (string) $parametro->base_regra_aplicada,
            'metodo' => $metodoCodigo !== '' ? $metodoCodigo : MetodoDepreciacaoRegraEnum::LINHA_RETA->value,
            'metodo_depreciacao_id' => $metodoId > 0 ? $metodoId : $this->resolverMetodoIdPorCodigo($metodoCodigo),
            'vida_util_anos' => $parametro->vida_util_anos ? (int) $parametro->vida_util_anos : null,
            'taxa_anual_percentual' => $parametro->taxa_anual_percentual !== null ? (float) $parametro->taxa_anual_percentual : null,
            'valor_residual_percentual' => $parametro->valor_residual_percentual !== null ? (float) $parametro->valor_residual_percentual : null,
            'valor_residual_monetario' => $parametro->valor_residual_monetario !== null ? (float) $parametro->valor_residual_monetario : null,
            'origem_da_regra' => 'parametro_bem',
            'regra_id' => $parametro->regra_depreciacao_id ? (int) $parametro->regra_depreciacao_id : null,
            'parametro_bem_id' => (int) $parametro->id,
            'empresa_id' => (int) $bem->empresa_id,
            'bem_patrimonial_id' => (int) $bem->id,
        ];
    }

    protected function mapearRegraPadrao(BemPatrimonial $bem, RegraDepreciacaoTipoBem $regra): array
    {
        $metodo = (string) ($regra->metodo_depreciacao ?: $this->mapearCodigoMetodoLegado($regra->metodoDepreciacao?->codigo));
        $metodoId = (int) ($regra->metodo_depreciacao_id ?: $this->resolverMetodoIdPorCodigo($metodo));

        return [
            'depreciavel' => Schema::hasColumn('regras_depreciacao_tipos_bens', 'depreciavel')
                ? (bool) $regra->depreciavel
                : ! $this->tipoBemEhTerreno((string) $regra->tipo_bem),
            'base_regra' => (string) ($regra->base_regra ?: BaseRegraDepreciacaoEnum::FISCAL->value),
            'metodo' => $metodo !== '' ? $metodo : MetodoDepreciacaoRegraEnum::LINHA_RETA->value,
            'metodo_depreciacao_id' => $metodoId > 0 ? $metodoId : null,
            'vida_util_anos' => (int) $regra->vida_util_anos,
            'taxa_anual_percentual' => (float) $regra->taxa_anual_efetiva,
            'valor_residual_percentual' => (float) ($regra->valor_residual_percentual ?? 0),
            'valor_residual_monetario' => null,
            'origem_da_regra' => 'regra_padrao',
            'regra_id' => (int) $regra->id,
            'parametro_bem_id' => null,
            'empresa_id' => (int) $bem->empresa_id,
            'bem_patrimonial_id' => (int) $bem->id,
        ];
    }

    protected function resolverFallbackLegado(BemPatrimonial $bem, string $base, string $data): array
    {
        $categoria = trim((string) $bem->categoria);
        $isTerreno = $this->tipoBemEhTerreno($categoria);

        $regraLegado = RegraDepreciacaoTipoBem::query()
            ->with('metodoDepreciacao')
            ->where('empresa_id', $bem->empresa_id)
            ->whereRaw('LOWER(tipo_bem) = ?', [mb_strtolower($categoria)])
            ->orderByDesc('id')
            ->first();

        $metodoId = $regraLegado?->metodo_depreciacao_id
            ?: $this->resolverMetodoIdPorCodigo(MetodoDepreciacaoRegraEnum::LINHA_RETA->value);
        $metodoCodigo = $regraLegado?->metodo_depreciacao
            ?: $this->mapearCodigoMetodoLegado($regraLegado?->metodoDepreciacao?->codigo)
            ?: MetodoDepreciacaoRegraEnum::LINHA_RETA->value;

        $vidaUtil = $bem->vida_util_anos ?: (int) ($regraLegado?->vida_util_anos ?? 0);
        $taxa = $regraLegado?->taxa_anual_percentual ?? $regraLegado?->taxa_anual;
        $residual = $regraLegado?->valor_residual_percentual ?? 0;

        if ((! $vidaUtil || $vidaUtil <= 0) && $metodoId) {
            $parametro = ParametroDepreciacao::query()
                ->where('empresa_id', $bem->empresa_id)
                ->where('metodo_depreciacao_id', $metodoId)
                ->first();

            if ($parametro) {
                $vidaUtil = (int) $parametro->vida_util_padrao;
                $taxa = $taxa ?? (float) $parametro->taxa_padrao;
            }
        }

        if ((! $taxa || (float) $taxa <= 0) && $vidaUtil > 0) {
            $taxa = 100 / $vidaUtil;
        }

        if ($isTerreno) {
            $vidaUtil = null;
            $taxa = 0;
            $residual = max(0, (float) $residual);
        }

        return [
            'depreciavel' => ! $isTerreno,
            'base_regra' => $base,
            'metodo' => $metodoCodigo,
            'metodo_depreciacao_id' => $metodoId,
            'vida_util_anos' => $vidaUtil > 0 ? $vidaUtil : null,
            'taxa_anual_percentual' => round((float) ($taxa ?? 0), 4),
            'valor_residual_percentual' => round((float) $residual, 4),
            'valor_residual_monetario' => null,
            'origem_da_regra' => 'fallback_legado',
            'regra_id' => $regraLegado?->id ? (int) $regraLegado->id : null,
            'parametro_bem_id' => null,
            'empresa_id' => (int) $bem->empresa_id,
            'bem_patrimonial_id' => (int) $bem->id,
            'data_referencia' => $data,
        ];
    }

    protected function normalizarBaseRegra(?string $baseRegra): string
    {
        $base = Str::lower(trim((string) $baseRegra));

        return in_array($base, [
            BaseRegraDepreciacaoEnum::FISCAL->value,
            BaseRegraDepreciacaoEnum::CONTABIL->value,
        ], true)
            ? $base
            : BaseRegraDepreciacaoEnum::FISCAL->value;
    }

    protected function tipoBemEhTerreno(?string $tipoBem): bool
    {
        $normalizado = $this->normalizarTipoBem($tipoBem);

        return str_contains($normalizado, 'terreno');
    }

    protected function normalizarTipoBem(?string $tipoBem): string
    {
        $ascii = Str::ascii(Str::lower(trim((string) $tipoBem)));

        return (string) preg_replace('/[^a-z0-9]+/', '', $ascii);
    }

    protected function mapearCodigoMetodoLegado(?string $codigoLegado): string
    {
        return match (Str::upper(trim((string) $codigoLegado))) {
            'SOMA_DIGITOS' => MetodoDepreciacaoRegraEnum::SOMA_DIGITOS->value,
            'UNIDADES_PRODUZIDAS' => MetodoDepreciacaoRegraEnum::UNIDADES_PRODUZIDAS->value,
            default => MetodoDepreciacaoRegraEnum::LINHA_RETA->value,
        };
    }

    protected function resolverMetodoIdPorCodigo(?string $codigoMetodo): ?int
    {
        $codigo = match (trim((string) $codigoMetodo)) {
            MetodoDepreciacaoRegraEnum::SOMA_DIGITOS->value => 'SOMA_DIGITOS',
            MetodoDepreciacaoRegraEnum::UNIDADES_PRODUZIDAS->value => 'UNIDADES_PRODUZIDAS',
            default => 'LINHA_RETA',
        };

        return MetodoDepreciacao::query()
            ->where('codigo', $codigo)
            ->value('id');
    }

    protected function tabelaPossuiColunas(string $table, array $columns): bool
    {
        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return false;
            }
        }

        return true;
    }
}
