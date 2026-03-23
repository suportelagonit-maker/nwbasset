<?php

namespace App\Domain\Depreciation\Requests;

class UpdateDepreciacaoBemRequest extends BaseDepreciationRequest
{
    public function rules(): array
    {
        $depreciacao = $this->route('depreciacao');
        $empresaId = $this->input('empresa_id', $depreciacao?->empresa_id);

        return [
            'empresa_id' => $this->empresaRule(false),
            'bem_patrimonial_id' => $this->bemRule($empresaId, false),
            'metodo_depreciacao_id' => ['nullable', ...$this->metodoRule(false)],
            'valor_aquisicao' => ['nullable', 'numeric', 'min:0'],
            'valor_residual' => ['nullable', 'numeric', 'min:0'],
            'vida_util_anos' => ['nullable', 'integer', 'min:1'],
            'data_calculo' => ['sometimes', 'required', 'date'],
        ];
    }
}
