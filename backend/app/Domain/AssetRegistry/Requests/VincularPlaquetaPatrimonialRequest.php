<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VincularPlaquetaPatrimonialRequest extends FormRequest
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
                'nullable',
                'integer',
                Rule::exists('filiais', 'id')->where(
                    fn ($query) => $query->where('empresa_id', $this->integer('empresa_id'))
                ),
            ],
            'plaqueta_id' => [
                'nullable',
                'integer',
                Rule::exists('plaquetas_patrimoniais', 'id')->where(
                    fn ($query) => $query->where('empresa_id', $this->integer('empresa_id'))
                ),
            ],
            'codigo_barras_conteudo' => ['nullable', 'string', 'max:120'],
            'bem_patrimonial_id' => [
                'required',
                'integer',
                Rule::exists('bens_patrimoniais', 'id')->where(
                    fn ($query) => $query->where('empresa_id', $this->integer('empresa_id'))
                ),
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->filled('plaqueta_id') && ! $this->filled('codigo_barras_conteudo')) {
                $validator->errors()->add('codigo_barras_conteudo', 'Informe a plaqueta ou o código de barras para vincular.');
            }
        });
    }
}
