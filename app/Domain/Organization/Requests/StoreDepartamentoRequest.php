<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDepartamentoRequest extends FormRequest
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
            'unidade_administrativa_id' => [
                'required',
                'integer',
                Rule::exists('unidades_administrativas', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))),
            ],
            'nome' => ['required', 'string', 'max:180'],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:20'],
        ];
    }
}
