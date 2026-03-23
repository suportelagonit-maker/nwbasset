<?php

namespace App\Domain\AssetMovements\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class BaseBemMovimentacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function empresaRule(bool $required = true): array
    {
        return [$required ? 'required' : 'sometimes', 'integer', Rule::exists('empresas', 'id')];
    }

    protected function filialRule(int|string|null $empresaId, bool $required = true): array
    {
        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('filiais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
        ];
    }

    protected function bemRule(int|string|null $empresaId, int|string|null $filialId, bool $required = true): array
    {
        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('bens_patrimoniais', 'id')->where(fn ($query) => $query
                ->where('empresa_id', $empresaId)
                ->where('filial_id', $filialId)),
        ];
    }

    protected function unidadeRule(string $field, int|string|null $empresaId, int|string|null $filialId, bool $required = true): array
    {
        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('unidades_administrativas', 'id')->where(fn ($query) => $query
                ->where('empresa_id', $empresaId)
                ->where('filial_id', $filialId)),
        ];
    }

    protected function departamentoRule(
        string $field,
        int|string|null $empresaId,
        int|string|null $filialId,
        int|string|null $unidadeId,
        bool $required = true,
    ): array {
        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('departamentos', 'id')->where(fn ($query) => $query
                ->where('empresa_id', $empresaId)
                ->where('filial_id', $filialId)
                ->where('unidade_administrativa_id', $unidadeId)),
        ];
    }

    protected function localRule(
        string $field,
        int|string|null $empresaId,
        int|string|null $filialId,
        int|string|null $unidadeId,
        int|string|null $departamentoId,
        bool $required = true,
    ): array {
        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('locais', 'id')->where(fn ($query) => $query
                ->where('empresa_id', $empresaId)
                ->where('filial_id', $filialId)
                ->where('unidade_administrativa_id', $unidadeId)
                ->where('departamento_id', $departamentoId)),
        ];
    }

    protected function responsavelRule(int|string|null $empresaId, int|string|null $filialId, bool $required = true): array
    {
        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('responsaveis', 'id')->where(fn ($query) => $query
                ->where('empresa_id', $empresaId)
                ->where('filial_id', $filialId)),
        ];
    }
}
