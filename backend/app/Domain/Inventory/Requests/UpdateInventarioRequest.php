<?php

namespace App\Domain\Inventory\Requests;

use App\Domain\Inventory\Enums\InventarioStatusEnum;
use Illuminate\Validation\Rule;

class UpdateInventarioRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        $inventario = $this->route('inventario');
        $dataInicio = $this->input('data_inicio', $inventario?->data_inicio?->toDateString());

        return [
            'nome' => ['sometimes', 'required', 'string', 'max:180'],
            'data_inicio' => ['sometimes', 'required', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:'.$dataInicio],
            'status' => ['nullable', 'string', Rule::in(InventarioStatusEnum::values())],
        ];
    }
}
