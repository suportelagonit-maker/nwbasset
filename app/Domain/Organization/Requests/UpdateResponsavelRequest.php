<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateResponsavelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $responsavel = $this->route('responsavel');
        $empresaId = $this->input('empresa_id', $responsavel?->empresa_id);

        return [
            'empresa_id' => ['sometimes', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'sometimes',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
            ],
            'nome' => ['sometimes', 'required', 'string', 'max:180'],
            'matricula' => [
                'sometimes',
                'required',
                'string',
                'max:40',
                Rule::unique('responsaveis', 'matricula')
                    ->where(fn ($query) => $query->where('empresa_id', $empresaId))
                    ->ignore($responsavel?->id),
            ],
            'cpf' => [
                'nullable',
                'string',
                'max:14',
                Rule::unique('responsaveis', 'cpf')
                    ->where(fn ($query) => $query->where('empresa_id', $empresaId))
                    ->ignore($responsavel?->id),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'cargo' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'max:20'],
        ];
    }
}
