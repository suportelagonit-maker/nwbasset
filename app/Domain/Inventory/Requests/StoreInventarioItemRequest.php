<?php

namespace App\Domain\Inventory\Requests;

use Illuminate\Validation\Rule;

class StoreInventarioItemRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        $inventarioId = $this->integer('inventario_id');

        return [
            'inventario_id' => $this->inventarioRule(),
            'bem_patrimonial_id' => [
                ...$this->bemNoInventarioRule($inventarioId),
                Rule::unique('inventario_itens', 'bem_patrimonial_id')->where(
                    fn ($query) => $query->where('inventario_id', $inventarioId)
                ),
            ],
            'localizado' => ['nullable', 'boolean'],
            'data_verificacao' => ['nullable', 'date'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
