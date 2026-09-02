<?php

namespace App\Domain\AssetRegistry\Requests;

use App\Domain\AssetRegistry\Enums\PlaquetaStatusEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlaquetaPatrimonialRequest extends FormRequest
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
            'bem_patrimonial_id' => [
                'required',
                'integer',
                Rule::exists('bens_patrimoniais', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))),
            ],
            'codigo_plaqueta' => [
                'nullable',
                'string',
                'max:80',
                Rule::unique('plaquetas_patrimoniais', 'codigo_plaqueta')
                    ->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'numero_plaqueta' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('plaquetas_patrimoniais', 'numero_plaqueta')
                    ->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'status' => ['nullable', 'string', Rule::in(PlaquetaStatusEnum::values())],
            'data_geracao' => ['nullable', 'date'],
            'data_aplicacao' => ['nullable', 'date', 'after_or_equal:data_geracao'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
