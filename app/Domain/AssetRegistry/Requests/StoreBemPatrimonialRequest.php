<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBemPatrimonialRequest extends FormRequest
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
            'departamento_id' => [
                'required',
                'integer',
                Rule::exists('departamentos', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))
                    ->where('unidade_administrativa_id', $this->input('unidade_administrativa_id'))),
            ],
            'local_id' => [
                'required',
                'integer',
                Rule::exists('locais', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))
                    ->where('unidade_administrativa_id', $this->input('unidade_administrativa_id'))
                    ->where('departamento_id', $this->input('departamento_id'))),
            ],
            'responsavel_id' => [
                'nullable',
                'integer',
                Rule::exists('responsaveis', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $this->input('empresa_id'))
                    ->where('filial_id', $this->input('filial_id'))),
            ],
            'numero_tombo' => [
                'required',
                'string',
                'max:60',
                Rule::unique('bens_patrimoniais', 'numero_tombo')->where(fn ($query) => $query->where('empresa_id', $this->input('empresa_id'))),
            ],
            'numero_serie' => ['nullable', 'string', 'max:120'],
            'descricao' => ['required', 'string'],
            'categoria' => ['nullable', 'string', 'max:120'],
            'marca' => ['nullable', 'string', 'max:120'],
            'modelo' => ['nullable', 'string', 'max:120'],
            'data_aquisicao' => ['nullable', 'date'],
            'valor_aquisicao' => ['nullable', 'numeric', 'min:0'],
            'valor_residual' => ['nullable', 'numeric', 'min:0'],
            'vida_util_anos' => ['nullable', 'integer', 'min:0'],
            'status_bem' => ['nullable', 'string', 'max:40'],
            'estado_conservacao' => ['nullable', 'string', 'max:40'],
        ];
    }
}
