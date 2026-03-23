<?php

namespace App\Domain\MultiCompany\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncUsuarioEmpresasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empresa_ids' => ['required', 'array', 'min:1'],
            'empresa_ids.*' => [Rule::exists('empresas', 'id')],
            'empresa_padrao_id' => ['nullable', Rule::exists('empresas', 'id')],
        ];
    }
}
