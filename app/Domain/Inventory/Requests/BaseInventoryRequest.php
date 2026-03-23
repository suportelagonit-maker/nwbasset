<?php

namespace App\Domain\Inventory\Requests;

use App\Domain\Inventory\Models\Inventario;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class BaseInventoryRequest extends FormRequest
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

    protected function inventarioRule(bool $required = true): array
    {
        return [$required ? 'required' : 'sometimes', 'integer', Rule::exists('inventarios', 'id')];
    }

    protected function bemNoInventarioRule(?int $inventarioId, bool $required = true): array
    {
        $inventario = $inventarioId ? Inventario::query()->find($inventarioId) : null;

        return [
            $required ? 'required' : 'sometimes',
            'integer',
            Rule::exists('bens_patrimoniais', 'id')->where(fn ($query) => $query->where('empresa_id', $inventario?->empresa_id ?? 0)),
        ];
    }
}
