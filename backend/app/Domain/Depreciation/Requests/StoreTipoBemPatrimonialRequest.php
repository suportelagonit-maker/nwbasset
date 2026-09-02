<?php

namespace App\Domain\Depreciation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTipoBemPatrimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->attributes->get('empresa_id');

        return [
            'nome' => [
                'required',
                'string',
                'max:120',
                Rule::unique('tipos_bens_patrimoniais', 'nome')->where('empresa_id', $empresaId),
            ],
        ];
    }
}
