<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreResponsavelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empresa_id' => ['required', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'required',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'departamento_id' => [
                'required',
                'integer',
                Rule::exists('departamentos', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))),
            ],
            'nome' => ['required', 'string', 'max:180'],
            'matricula' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
                Rule::unique('responsaveis', 'matricula')->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'cpf' => [
                'nullable',
                'string',
                'max:14',
                Rule::unique('responsaveis', 'cpf')->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'cargo' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'max:20'],
        ];
    }
}
