<?php

namespace App\Domain\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventarioItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'inventario_id' => $this->inventario_id,
            'bem_patrimonial_id' => $this->bem_patrimonial_id,
            'localizado' => $this->localizado,
            'data_verificacao' => $this->data_verificacao,
            'observacoes' => $this->observacoes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
