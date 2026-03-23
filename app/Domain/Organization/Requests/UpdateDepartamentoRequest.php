<?php

namespace App\Domain\Organization\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDepartamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $departamento = $this->route('departamento');
        $empresaId = $this->input('empresa_id', $departamento?->empresa_id);
        $filialId = $this->input('filial_id', $departamento?->filial_id);

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
            'nome' => ['sometimes', 'required', 'string', 'max:180'],
            'descricao' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:20'],
        ];
    }
}
