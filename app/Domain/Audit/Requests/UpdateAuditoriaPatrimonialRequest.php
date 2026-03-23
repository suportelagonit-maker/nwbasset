<?php

namespace App\Domain\Audit\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAuditoriaPatrimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data_auditoria' => ['sometimes', 'required', 'date'],
            'auditor' => ['sometimes', 'required', 'string', 'max:180'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
