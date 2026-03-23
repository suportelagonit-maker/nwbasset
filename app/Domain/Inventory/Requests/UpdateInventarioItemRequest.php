<?php

namespace App\Domain\Inventory\Requests;

class UpdateInventarioItemRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        $item = $this->route('inventario_item');
        $dataVerificacao = $this->input('data_verificacao', $item?->data_verificacao?->toDateString());

        return [
            'localizado' => ['sometimes', 'required', 'boolean'],
            'data_verificacao' => ['nullable', 'date'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
