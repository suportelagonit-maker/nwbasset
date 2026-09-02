<?php

namespace App\Domain\Audit\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAuditoriaPatrimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empresa_id' => ['required', 'integer', Rule::exists('empresas', 'id')],
            'inventario_id' => [
                'required',
                'integer',
                Rule::exists('inventarios', 'id')->where(
                    fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))
                ),
            ],
            'data_auditoria' => ['required', 'date'],
            'auditor' => ['required', 'string', 'max:180'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
