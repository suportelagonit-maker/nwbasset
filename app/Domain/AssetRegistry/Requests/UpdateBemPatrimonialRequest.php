<?php

namespace App\Domain\AssetRegistry\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class UpdateBemPatrimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $bem = $this->route('bem');
        $empresaId = $this->input('empresa_id', $bem?->empresa_id);
        $filialId = $this->input('filial_id', $bem?->filial_id);
        $unidadeId = $this->input('unidade_administrativa_id', $bem?->unidade_administrativa_id);
        $departamentoId = $this->input('departamento_id', $bem?->departamento_id);

        return [
            'empresa_id' => ['sometimes', 'required', 'integer', Rule::exists('empresas', 'id')],
            'filial_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
            ],
            'unidade_administrativa_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('unidades_administrativas', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)),
            ],
            'departamento_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('departamentos', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)
                    ->where('unidade_administrativa_id', $unidadeId)),
            ],
            'local_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('locais', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)
                    ->where('unidade_administrativa_id', $unidadeId)
                    ->where('departamento_id', $departamentoId)),
            ],
            'responsavel_id' => [
                'nullable',
                'integer',
                Rule::exists('responsaveis', 'id')->where(fn ($query) => $query
                    ->where('empresa_id', $empresaId)
                    ->where('filial_id', $filialId)
                    ->where('departamento_id', $departamentoId)),
            ],
            'numero_tombo' => [
                'sometimes',
                'required',
                'string',
                'max:60',
                Rule::unique('bens_patrimoniais', 'numero_tombo')
                    ->where(fn ($query) => $query->where('empresa_id', $empresaId))
                    ->ignore($bem?->id),
            ],
            'numero_serie' => ['nullable', 'string', 'max:120'],
            'descricao' => ['sometimes', 'required', 'string'],
            'categoria' => array_merge(
                ['sometimes', 'required'],
                $this->categoriaRules((int) $empresaId),
            ),
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

    private function categoriaRules(int $empresaId): array
    {
        $rules = ['string', 'max:120'];

        if (Schema::hasTable('tipos_bens_patrimoniais')) {
            $rules[] = Rule::exists('tipos_bens_patrimoniais', 'nome')
                ->where(fn ($query) => $query->where('empresa_id', $empresaId));
        }

        return $rules;
    }
}
