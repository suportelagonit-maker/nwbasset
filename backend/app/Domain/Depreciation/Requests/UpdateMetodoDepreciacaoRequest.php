<?php

namespace App\Domain\Depreciation\Requests;

use Illuminate\Validation\Rule;

class UpdateMetodoDepreciacaoRequest extends BaseDepreciationRequest
{
    public function rules(): array
    {
        $metodo = $this->route('metodo_depreciacao');

        return [
            'nome' => ['sometimes', 'required', 'string', 'max:120'],
            'codigo' => ['sometimes', 'required', 'string', 'max:40', Rule::unique('metodos_depreciacao', 'codigo')->ignore($metodo?->id)],
            'descricao' => ['nullable', 'string'],
        ];
    }
}
