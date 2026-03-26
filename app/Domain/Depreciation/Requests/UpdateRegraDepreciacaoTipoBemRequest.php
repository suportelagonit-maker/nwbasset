<?php

namespace App\Domain\Depreciation\Requests;

use App\Domain\Depreciation\Enums\BaseRegraDepreciacaoEnum;
use App\Domain\Depreciation\Enums\MetodoDepreciacaoRegraEnum;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateRegraDepreciacaoTipoBemRequest extends StoreRegraDepreciacaoTipoBemRequest
{
    public function rules(): array
    {
        $empresaId = (int) $this->input('empresa_id');
        $tipoBemIdRules = ['nullable', 'integer'];

        if (Schema::hasTable('tipos_bens_patrimoniais')) {
            $tipoBemIdRules[] = Rule::exists('tipos_bens_patrimoniais', 'id')
                ->where(fn ($query) => $query->where('empresa_id', $empresaId));
        }

        return [
            'empresa_id' => $this->empresaRule(false),
            'tipo_bem_id' => $tipoBemIdRules,
            'tipo_bem' => ['sometimes', 'required_without:tipo_bem_id', 'string', 'max:120'],
            'nome_regra' => ['nullable', 'string', 'max:150'],
            'base_regra' => ['nullable', Rule::in([
                BaseRegraDepreciacaoEnum::FISCAL->value,
                BaseRegraDepreciacaoEnum::CONTABIL->value,
            ])],
            'metodo_depreciacao_id' => $this->metodoRule(false),
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
        $regra = $this->resolverRegra();

        $this->merge([
            'empresa_id' => $this->input('empresa_id', $regra?->empresa_id),
            'tipo_bem_id' => $this->input('tipo_bem_id', $regra?->tipo_bem_id),
            'tipo_bem' => $this->input('tipo_bem', $regra?->tipo_bem),
            'nome_regra' => $this->input('nome_regra', $regra?->nome_regra),
            'base_regra' => $this->input('base_regra', $regra?->base_regra ?? BaseRegraDepreciacaoEnum::FISCAL->value),
            'metodo_depreciacao_id' => $this->input('metodo_depreciacao_id', $regra?->metodo_depreciacao_id),
            'metodo_depreciacao' => $this->input('metodo_depreciacao', $regra?->metodo_depreciacao ?? MetodoDepreciacaoRegraEnum::LINHA_RETA->value),
            'vida_util_anos' => $this->input('vida_util_anos', $regra?->vida_util_anos),
            'taxa_anual' => $this->input('taxa_anual', $regra?->taxa_anual_percentual ?? $regra?->taxa_anual),
            'taxa_anual_percentual' => $this->input('taxa_anual_percentual', $regra?->taxa_anual_percentual ?? $regra?->taxa_anual),
            'valor_residual_percentual' => $this->input('valor_residual_percentual', $regra?->valor_residual_percentual ?? 0),
            'depreciavel' => $this->has('depreciavel') ? $this->input('depreciavel') : $regra?->depreciavel,
            'requer_override_manual' => $this->has('requer_override_manual')
                ? $this->input('requer_override_manual')
                : $regra?->requer_override_manual,
            'data_inicio_vigencia' => $this->input('data_inicio_vigencia', $regra?->data_inicio_vigencia?->toDateString() ?: now()->toDateString()),
            'data_fim_vigencia' => $this->input('data_fim_vigencia', $regra?->data_fim_vigencia?->toDateString()),
            'ativo' => $this->has('ativo') ? $this->input('ativo') : $regra?->ativo,
            'observacoes' => $this->input('observacoes', $regra?->observacoes),
        ]);

        parent::prepareForValidation();
    }

    public function withValidator(Validator $validator): void
    {
        parent::withValidator($validator);
    }

    public function payload(): array
    {
        $payload = parent::payload();
        $payload['criado_por'] = $this->resolverRegra()?->criado_por;
        $payload['atualizado_por'] = $this->user()?->id ? (int) $this->user()->id : null;

        return $payload;
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

        $regraAtual = $this->resolverRegra();
        if (! $regraAtual) {
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
        $ativo = (bool) $this->boolean('ativo');

        if (! $ativo) {
            return false;
        }

        $query = RegraDepreciacaoTipoBem::query()
            ->where('empresa_id', $empresaId)
            ->where('base_regra', $baseRegra)
            ->where('ativo', true)
            ->whereKeyNot($regraAtual->id)
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

    protected function resolverRegra(): ?RegraDepreciacaoTipoBem
    {
        $regra = $this->route('regra_depreciacao');

        if ($regra instanceof RegraDepreciacaoTipoBem) {
            return $regra;
        }

        $id = (int) $this->route('regra_depreciacao');

        return $id > 0 ? RegraDepreciacaoTipoBem::query()->find($id) : null;
    }
}
