<?php

namespace App\Domain\Depreciation\Requests;

class StoreDepreciacaoBemRequest extends BaseDepreciationRequest
{
    public function rules(): array
    {
        return [
            'empresa_id' => $this->empresaRule(),
            'bem_patrimonial_id' => $this->bemRule($this->input('empresa_id')),
            'metodo_depreciacao_id' => ['nullable', ...$this->metodoRule(false)],
            'valor_aquisicao' => ['nullable', 'numeric', 'min:0'],
            'valor_residual' => ['nullable', 'numeric', 'min:0'],
            'vida_util_anos' => ['nullable', 'integer', 'min:1'],
            'data_calculo' => ['required', 'date'],
        ];
    }
}
