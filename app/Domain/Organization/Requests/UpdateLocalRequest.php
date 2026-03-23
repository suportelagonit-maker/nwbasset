<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLocalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $local = $this->route('local');
        $empresaId = $this->input('empresa_id', $local?->empresa_id);
        $filialId = $this->input('filial_id', $local?->filial_id);
        $unidadeId = $this->input('unidade_administrativa_id', $local?->unidade_administrativa_id);

        return [
            'empresa_id' => ['sometimes', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'sometimes',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
            ],
            'unidade_administrativa_id' => [
                'sometimes',
                'integer',
                Rule::exists('unidades_administrativas', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)),
            ],
            'departamento_id' => [
                'sometimes',
                'integer',
                Rule::exists('departamentos', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)
                    ->where('unidade_administrativa_id', $unidadeId)),
            ],
            'nome' => ['sometimes', 'required', 'string', 'max:180'],
            'endereco' => ['nullable', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:20'],
        ];
    }
}
