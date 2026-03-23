<?php

namespace App\Domain\Inventory\Requests;

use App\Domain\Inventory\Enums\TipoDivergenciaInventarioEnum;
use Illuminate\Validation\Rule;

class UpdateDivergenciaInventarioRequest extends BaseInventoryRequest
{
    public function rules(): array
    {
        $divergencia = $this->route('divergencia');
        $inventarioId = $divergencia?->inventario_id;

        return [
            'bem_patrimonial_id' => $this->bemNoInventarioRule($inventarioId, false),
            'tipo_divergencia' => ['sometimes', 'required', 'string', Rule::in(TipoDivergenciaInventarioEnum::values())],
            'descricao' => ['sometimes', 'required', 'string'],
        ];
    }
}
