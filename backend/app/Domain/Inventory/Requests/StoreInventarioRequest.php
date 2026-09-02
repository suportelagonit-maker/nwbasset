<?php

namespace App\Domain\Inventory\Requests;

use App\Domain\Inventory\Enums\InventarioStatusEnum;
use Illuminate\Validation\Rule;

class StoreInventarioRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        return [
            'empresa_id' => $this->empresaRule(),
            'filial_id' => $this->filialRule($this->input('empresa_id')),
            'nome' => ['required', 'string', 'max:180'],
            'data_inicio' => ['required', 'date'],
            'data_fim' => ['nullable', 'date', 'after_or_equal:data_inicio'],
            'status' => ['nullable', 'string', Rule::in(InventarioStatusEnum::values())],
        ];
    }
}
