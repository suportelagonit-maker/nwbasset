<?php

namespace App\Domain\Inventory\Requests;

class StoreConciliacaoPatrimonialRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        return [
            'inventario_id' => $this->inventarioRule(),
            'data_conciliacao' => ['required', 'date'],
        ];
    }
}
