<?php

namespace App\Domain\Inventory\Requests;

use App\Domain\Inventory\Enums\TipoDivergenciaInventarioEnum;
use Illuminate\Validation\Rule;

class StoreDivergenciaInventarioRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        $inventarioId = $this->integer('inventario_id');

        return [
            'inventario_id' => $this->inventarioRule(),
            'bem_patrimonial_id' => $this->bemNoInventarioRule($inventarioId),
            'tipo_divergencia' => ['required', 'string', Rule::in(TipoDivergenciaInventarioEnum::values())],
            'descricao' => ['required', 'string'],
        ];
    }
}
