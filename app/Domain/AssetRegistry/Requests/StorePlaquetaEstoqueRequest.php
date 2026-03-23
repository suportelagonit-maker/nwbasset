<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlaquetaEstoqueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empresa_id' => ['required', 'integer', Rule::exists('empresas', 'id')],
            'numero_plaqueta' => [
                'required',
                'string',
                'max:20',
                Rule::unique('plaquetas_patrimoniais', 'numero_plaqueta')
                    ->where(fn ($query) => $query->where('empresa_id', $this->integer('empresa_id'))),
            ],
            'codigo_barras_conteudo' => [
                'required',
                'string',
                'max:120',
                Rule::unique('plaquetas_patrimoniais', 'codigo_barras_conteudo')
                    ->where(fn ($query) => $query->where('empresa_id', $this->integer('empresa_id'))),
            ],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
