<?php

namespace App\Domain\Depreciation\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class BaseDepreciationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function empresaRule(bool $required = true): array
    {
        return [$required ? 'required' : 'sometimes', 'integer', Rule::exists('empresas', 'id')];
    }

    protected function metodoRule(bool $required = true): array
    {
        return [$required ? 'required' : 'sometimes', 'integer', Rule::exists('metodos_depreciacao', 'id')];
    }

    protected function bemRule(int|string|null $empresaId, bool $required = true): array
    {
        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('bens_patrimoniais', 'id')->where(fn ($query) => $query->where('empresa_id', $empresaId)),
        ];
    }
}
