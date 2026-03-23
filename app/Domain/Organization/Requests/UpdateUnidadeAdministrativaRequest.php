<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnidadeAdministrativaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $unidade = $this->route('unidade_administrativa');
        $empresaId = $this->input('empresa_id', $unidade?->empresa_id);

        return [
            'empresa_id' => ['sometimes', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'sometimes',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
            ],
            'nome' => ['sometimes', 'required', 'string', 'max:180'],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:20'],
        ];
    }
}
