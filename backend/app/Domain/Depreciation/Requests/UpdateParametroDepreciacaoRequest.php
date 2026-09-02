<?php

namespace App\Domain\Depreciation\Requests;

use Illuminate\Validation\Rule;

class UpdateParametroDepreciacaoRequest extends BaseDepreciationRequest
{
    public function rules(): array
    {
        $parametro = $this->route('parametro_depreciacao');
        $empresaId = $this->input('empresa_id', $parametro?->empresa_id);
        $metodoId = $this->input('metodo_depreciacao_id', $parametro?->metodo_depreciacao_id);

        return [
            'empresa_id' => $this->empresaRule(false),
            'metodo_depreciacao_id' => $this->metodoRule(false),
            'vida_util_padrao' => ['sometimes', 'required', 'integer', 'min:1'],
            'taxa_padrao' => ['sometimes', 'required', 'numeric', 'min:0'],
            'empresa_metodo' => [
                Rule::unique('parametros_depreciacao', 'empresa_id')
                    ->where(fn ($query) => $query->where('metodo_depreciacao_id', $metodoId))
                    ->ignore($parametro?->id),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $parametro = $this->route('parametro_depreciacao');

        $this->merge([
            'empresa_metodo' => $this->input('empresa_id', $parametro?->empresa_id),
        ]);
    }
}
