<?php

namespace App\Domain\AssetRegistry\Requests;

use App\Domain\AssetRegistry\Enums\PlaquetaStatusEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlaquetaPatrimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $plaqueta = $this->route('plaqueta');
        $empresaId = $this->input('empresa_id', $plaqueta?->empresa_id);
        $filialId = $this->input('filial_id', $plaqueta?->filial_id);

        return [
            'empresa_id' => ['sometimes', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'sometimes',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
            ],
            'bem_patrimonial_id' => [
                'sometimes',
                'integer',
                Rule::exists('bens_patrimoniais', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)),
            ],
            'codigo_plaqueta' => [
                'sometimes',
                'required',
                'string',
                'max:80',
                Rule::unique('plaquetas_patrimoniais', 'codigo_plaqueta')
                    ->where(fn ($query) => $query->where('empresa_id', $empresaId))
                    ->ignore($plaqueta?->id),
            ],
            'numero_plaqueta' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('plaquetas_patrimoniais', 'numero_plaqueta')
                    ->where(fn ($query) => $query->where('empresa_id', $empresaId))
                    ->ignore($plaqueta?->id),
            ],
            'status' => ['sometimes', 'required', 'string', Rule::in(PlaquetaStatusEnum::values())],
            'data_geracao' => ['sometimes', 'required', 'date'],
            'data_aplicacao' => ['nullable', 'date', 'after_or_equal:data_geracao'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
