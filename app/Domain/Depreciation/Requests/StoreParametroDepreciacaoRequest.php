<?php

namespace App\Domain\Depreciation\Requests;

use Illuminate\Validation\Rule;

class StoreParametroDepreciacaoRequest extends BaseDepreciationRequest
{
    public function rules(): array
    {
        return [
            'empresa_id' => $this->empresaRule(),
            'metodo_depreciacao_id' => $this->metodoRule(),
            'vida_util_padrao' => ['required', 'integer', 'min:1'],
            'taxa_padrao' => ['required', 'numeric', 'min:0'],
            'empresa_metodo' => [
                Rule::unique('parametros_depreciacao', 'empresa_id')->where(
                    fn ($query) => $query->where('metodo_depreciacao_id', $this->input('metodo_depreciacao_id'))
                ),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'empresa_metodo' => $this->input('empresa_id'),
        ]);
    }
}
