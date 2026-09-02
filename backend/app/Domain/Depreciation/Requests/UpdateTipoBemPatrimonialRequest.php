<?php

namespace App\Domain\Depreciation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTipoBemPatrimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $empresaId = (int) $this->attributes->get('empresa_id');
        $tipoId = (int) ($this->route('tipo_bem')->id ?? 0);

        return [
            'nome' => [
                'sometimes',
                'required',
                'string',
                'max:120',
                Rule::unique('tipos_bens_patrimoniais', 'nome')
                    ->where('empresa_id', $empresaId)
                    ->ignore($tipoId),
            ],
        ];
    }
}
