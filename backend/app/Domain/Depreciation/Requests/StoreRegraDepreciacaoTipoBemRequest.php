<?php

namespace App\Domain\Depreciation\Requests;

use App\Domain\Depreciation\Enums\BaseRegraDepreciacaoEnum;
use App\Domain\Depreciation\Enums\MetodoDepreciacaoRegraEnum;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreRegraDepreciacaoTipoBemRequest extends BaseDepreciationRequest
{
    private const PRESETS_PADRAO = [
        'informatica' => ['vida_util_anos' => 5, 'valor_residual_percentual' => 0.0, 'depreciavel' => true],
        'equipamentos' => ['vida_util_anos' => 10, 'valor_residual_percentual' => 0.0, 'depreciavel' => true],
        'mobiliario' => ['vida_util_anos' => 10, 'valor_residual_percentual' => 0.0, 'depreciavel' => true],
        'utensilios' => ['vida_util_anos' => 10, 'valor_residual_percentual' => 0.0, 'depreciavel' => true],
        'veiculos' => ['vida_util_anos' => 5, 'valor_residual_percentual' => 0.0, 'depreciavel' => true],
        'edificacoes' => ['vida_util_anos' => 25, 'valor_residual_percentual' => 0.0, 'depreciavel' => true],
        'imoveis' => ['vida_util_anos' => 25, 'valor_residual_percentual' => 0.0, 'depreciavel' => true],
        'terrenos' => ['vida_util_anos' => 1, 'valor_residual_percentual' => 0.0, 'depreciavel' => false],
    ];

    public function rules(): array
    {
        $empresaId = (int) $this->input('empresa_id');
        $tipoBemIdRules = ['nullable', 'integer'];

        if (Schema::hasTable('tipos_bens_patrimoniais')) {
            $tipoBemIdRules[] = Rule::exists('tipos_bens_patrimoniais', 'id')
                ->where(fn ($query) => $query->where('empresa_id', $empresaId));
        }

        return [
            'empresa_id' => $this->empresaRule(),
            'tipo_bem_id' => $tipoBemIdRules,
            'tipo_bem' => ['required_without:tipo_bem_id', 'string', 'max:120'],
            'nome_regra' => ['nullable', 'string', 'max:150'],
            'base_regra' => ['nullable', Rule::in([
                BaseRegraDepreciacaoEnum::FISCAL->value,
                BaseRegraDepreciacaoEnum::CONTABIL->value,
            ])],
            'metodo_depreciacao_id' => $this->metodoRule(),
            'metodo_depreciacao' => ['nullable', Rule::in(array_map(
                static fn (MetodoDepreciacaoRegraEnum $case): string => $case->value,
                MetodoDepreciacaoRegraEnum::cases(),
            ))],
            'vida_util_anos' => ['nullable', 'integer', 'min:1'],
            'taxa_anual' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'taxa_anual_percentual' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'valor_residual_percentual' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'depreciavel' => ['nullable', 'boolean'],
            'requer_override_manual' => ['nullable', 'boolean'],
            'data_inicio_vigencia' => ['nullable', 'date'],
            'data_fim_vigencia' => ['nullable', 'date', 'after_or_equal:data_inicio_vigencia'],
            'ativo' => ['nullable', 'boolean'],
            'observacoes' => ['nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $tipoBemInput = trim((string) $this->input('tipo_bem'));
        $preset = $this->resolverPresetPorTipoBem($tipoBemInput);
        $taxaPreset = $preset
            ? ($preset['depreciavel'] ? round(100 / max(1, (int) $preset['vida_util_anos']), 4) : 0.0)
            : null;

        $this->merge([
            'tipo_bem' => $tipoBemInput,
            'base_regra' => Str::lower(trim((string) $this->input('base_regra', BaseRegraDepreciacaoEnum::FISCAL->value))),
            'metodo_depreciacao' => trim((string) $this->input('metodo_depreciacao')),
            'data_inicio_vigencia' => $this->input('data_inicio_vigencia') ?: now()->toDateString(),
            'depreciavel' => $this->has('depreciavel')
                ? $this->input('depreciavel')
                : ($preset['depreciavel'] ?? null),
            'vida_util_anos' => $this->input('vida_util_anos', $preset['vida_util_anos'] ?? null),
            'taxa_anual_percentual' => $this->input(
                'taxa_anual_percentual',
                $this->input('taxa_anual', $taxaPreset),
            ),
            'valor_residual_percentual' => $this->input(
                'valor_residual_percentual',
                $preset['valor_residual_percentual'] ?? 0,
            ),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $depreciavel = $this->resolverDepreciavelPadrao();
            $vidaUtil = $this->input('vida_util_anos');
            $taxa = $this->input('taxa_anual_percentual');

            if ($depreciavel && (int) ($vidaUtil ?? 0) <= 0 && (float) ($taxa ?? 0) <= 0) {
                $validator->errors()->add('vida_util_anos', 'Informe vida util ou taxa anual para bens depreciaveis.');
            }

            if (! $depreciavel && (float) ($taxa ?? 0) > 0) {
                $validator->errors()->add('taxa_anual_percentual', 'Bem nao depreciavel deve possuir taxa anual igual a zero.');
            }

            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if ($this->possuiConflitoDeVigencia()) {
                $validator->errors()->add(
                    'data_inicio_vigencia',
                    'Ja existe regra ativa com vigencia conflitante para este tipo de bem e base.',
                );
            }
        });
    }

    public function payload(): array
    {
        $empresaId = (int) $this->input('empresa_id');
        $tipoBemId = $this->input('tipo_bem_id') ? (int) $this->input('tipo_bem_id') : null;
        $tipoBem = $this->resolverNomeTipoBem($empresaId, $tipoBemId, (string) $this->input('tipo_bem'));
        $preset = $this->resolverPresetPorTipoBem($tipoBem);
        $baseRegra = $this->normalizarBaseRegra((string) $this->input('base_regra'));
        $metodoCodigo = $this->resolverMetodoCodigo(
            $this->input('metodo_depreciacao_id') ? (int) $this->input('metodo_depreciacao_id') : null,
            $this->input('metodo_depreciacao') ? (string) $this->input('metodo_depreciacao') : null,
        );
        $depreciavel = $this->resolverDepreciavelPadrao($tipoBem);
        $vidaUtil = $this->resolverVidaUtil($depreciavel, $preset);
        $taxa = $this->resolverTaxaAnualPercentual($depreciavel, $vidaUtil, $preset);
        $residual = round((float) $this->input('valor_residual_percentual', $preset['valor_residual_percentual'] ?? 0), 4);
        $inicioVigencia = Carbon::parse((string) $this->input('data_inicio_vigencia'))->toDateString();
        $fimVigencia = $this->input('data_fim_vigencia')
            ? Carbon::parse((string) $this->input('data_fim_vigencia'))->toDateString()
            : null;

        return [
            'empresa_id' => $empresaId,
            'tipo_bem_id' => $tipoBemId,
            'tipo_bem' => $tipoBem,
            'nome_regra' => trim((string) $this->input('nome_regra')) ?: "Regra {$baseRegra} - {$tipoBem}",
            'base_regra' => $baseRegra,
            'metodo_depreciacao_id' => (int) $this->input('metodo_depreciacao_id'),
            'metodo_depreciacao' => $metodoCodigo,
            'vida_util_anos' => $vidaUtil,
            'taxa_anual' => $taxa,
            'taxa_anual_percentual' => $taxa,
            'valor_residual_percentual' => $residual,
            'depreciavel' => $depreciavel,
            'requer_override_manual' => (bool) $this->boolean('requer_override_manual'),
            'data_inicio_vigencia' => $inicioVigencia,
            'data_fim_vigencia' => $fimVigencia,
            'ativo' => $this->has('ativo') ? (bool) $this->boolean('ativo') : true,
            'observacoes' => $this->filled('observacoes') ? trim((string) $this->input('observacoes')) : null,
            'criado_por' => $this->user()?->id ? (int) $this->user()->id : null,
            'atualizado_por' => $this->user()?->id ? (int) $this->user()->id : null,
        ];
    }

    protected function possuiConflitoDeVigencia(): bool
    {
        if (! $this->tabelaPossuiColunas('regras_depreciacao_tipos_bens', [
            'data_inicio_vigencia',
            'data_fim_vigencia',
            'base_regra',
            'ativo',
        ])) {
            return false;
        }

        $empresaId = (int) $this->input('empresa_id');
        $tipoBemId = $this->input('tipo_bem_id') ? (int) $this->input('tipo_bem_id') : null;
        $tipoBem = $this->resolverNomeTipoBem($empresaId, $tipoBemId, (string) $this->input('tipo_bem'));
        $baseRegra = $this->normalizarBaseRegra((string) $this->input('base_regra'));
        $inicio = Carbon::parse((string) $this->input('data_inicio_vigencia'))->toDateString();
        $fim = $this->input('data_fim_vigencia')
            ? Carbon::parse((string) $this->input('data_fim_vigencia'))->toDateString()
            : null;
        $ativo = $this->has('ativo') ? (bool) $this->boolean('ativo') : true;

        if (! $ativo) {
            return false;
        }

        $query = RegraDepreciacaoTipoBem::query()
            ->where('empresa_id', $empresaId)
            ->where('base_regra', $baseRegra)
            ->where('ativo', true)
            ->where(function ($scope) use ($tipoBemId, $tipoBem): void {
                if ($tipoBemId) {
                    $scope->where('tipo_bem_id', $tipoBemId);
                    return;
                }

                $scope->whereRaw('LOWER(tipo_bem) = ?', [mb_strtolower($tipoBem)]);
            });

        if ($fim) {
            $query->whereDate('data_inicio_vigencia', '<=', $fim);
        }

        $query->where(function ($scope) use ($inicio): void {
            $scope->whereNull('data_fim_vigencia')
                ->orWhereDate('data_fim_vigencia', '>=', $inicio);
        });

        return $query->exists();
    }

    protected function resolverDepreciavelPadrao(?string $tipoBem = null): bool
    {
        if ($this->has('depreciavel')) {
            return (bool) $this->boolean('depreciavel');
        }

        $tipoNormalizado = Str::lower(Str::ascii(trim((string) ($tipoBem ?? $this->input('tipo_bem')))));

        return ! str_contains($tipoNormalizado, 'terreno');
    }

    protected function resolverVidaUtil(bool $depreciavel, ?array $preset = null): int
    {
        $vidaUtil = $this->input('vida_util_anos');
        if ($vidaUtil !== null && (int) $vidaUtil > 0) {
            return (int) $vidaUtil;
        }

        if ($preset && (int) ($preset['vida_util_anos'] ?? 0) > 0) {
            return (int) $preset['vida_util_anos'];
        }

        $taxa = (float) $this->input('taxa_anual_percentual', $this->input('taxa_anual', 0));

        if ($depreciavel && $taxa > 0) {
            return max(1, (int) round(100 / $taxa));
        }

        return 1;
    }

    protected function resolverTaxaAnualPercentual(bool $depreciavel, int $vidaUtilAnos, ?array $preset = null): float
    {
        $taxaInput = $this->input('taxa_anual_percentual', $this->input('taxa_anual'));
        if ($taxaInput !== null && (float) $taxaInput >= 0) {
            return round((float) $taxaInput, 4);
        }

        if ($preset && isset($preset['vida_util_anos']) && (int) $preset['vida_util_anos'] > 0) {
            return $depreciavel ? round(100 / (int) $preset['vida_util_anos'], 4) : 0.0;
        }

        if (! $depreciavel || $vidaUtilAnos <= 0) {
            return 0.0;
        }

        return round(100 / $vidaUtilAnos, 4);
    }

    protected function resolverNomeTipoBem(int $empresaId, ?int $tipoBemId, ?string $tipoBemInput): string
    {
        if ($tipoBemId && Schema::hasTable('tipos_bens_patrimoniais')) {
            $tipo = TipoBemPatrimonial::query()
                ->where('empresa_id', $empresaId)
                ->find($tipoBemId);

            if ($tipo) {
                return (string) $tipo->nome;
            }
        }

        return trim((string) $tipoBemInput);
    }

    protected function resolverMetodoCodigo(?int $metodoDepreciacaoId, ?string $metodoDepreciacao): string
    {
        if ($metodoDepreciacao) {
            return match (Str::lower(trim($metodoDepreciacao))) {
                MetodoDepreciacaoRegraEnum::SOMA_DIGITOS->value => MetodoDepreciacaoRegraEnum::SOMA_DIGITOS->value,
                MetodoDepreciacaoRegraEnum::UNIDADES_PRODUZIDAS->value => MetodoDepreciacaoRegraEnum::UNIDADES_PRODUZIDAS->value,
                default => MetodoDepreciacaoRegraEnum::LINHA_RETA->value,
            };
        }

        $codigoLegado = $metodoDepreciacaoId
            ? MetodoDepreciacao::query()->whereKey($metodoDepreciacaoId)->value('codigo')
            : null;

        return match (Str::upper(trim((string) $codigoLegado))) {
            'SOMA_DIGITOS' => MetodoDepreciacaoRegraEnum::SOMA_DIGITOS->value,
            'UNIDADES_PRODUZIDAS' => MetodoDepreciacaoRegraEnum::UNIDADES_PRODUZIDAS->value,
            default => MetodoDepreciacaoRegraEnum::LINHA_RETA->value,
        };
    }

    protected function normalizarBaseRegra(?string $baseRegra): string
    {
        return match (Str::lower(trim((string) $baseRegra))) {
            BaseRegraDepreciacaoEnum::CONTABIL->value => BaseRegraDepreciacaoEnum::CONTABIL->value,
            default => BaseRegraDepreciacaoEnum::FISCAL->value,
        };
    }

    protected function resolverPresetPorTipoBem(?string $tipoBem): ?array
    {
        $normalizado = Str::ascii(Str::lower(trim((string) $tipoBem)));
        $chave = (string) preg_replace('/[^a-z0-9]+/', '', $normalizado);

        if ($chave === '') {
            return null;
        }

        if (str_contains($chave, 'terreno')) {
            return self::PRESETS_PADRAO['terrenos'];
        }

        if (str_contains($chave, 'edificacao') || str_contains($chave, 'predio')) {
            return self::PRESETS_PADRAO['edificacoes'];
        }

        foreach (self::PRESETS_PADRAO as $presetChave => $preset) {
            if ($chave === $presetChave || str_contains($chave, $presetChave)) {
                return $preset;
            }
        }

        return null;
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
