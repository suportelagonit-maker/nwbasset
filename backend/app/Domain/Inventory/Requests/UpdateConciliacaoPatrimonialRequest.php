<?php

namespace App\Domain\Inventory\Requests;

class UpdateConciliacaoPatrimonialRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        return [
            'data_conciliacao' => ['sometimes', 'required', 'date'],
        ];
    }
}
