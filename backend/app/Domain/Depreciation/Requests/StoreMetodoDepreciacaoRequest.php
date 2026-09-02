<?php

namespace App\Domain\Depreciation\Requests;

use Illuminate\Validation\Rule;

class StoreMetodoDepreciacaoRequest extends BaseDepreciationRequest
{
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:120'],
            'codigo' => ['required', 'string', 'max:40', Rule::unique('metodos_depreciacao', 'codigo')],
            'descricao' => ['nullable', 'string'],
        ];
    }
}
