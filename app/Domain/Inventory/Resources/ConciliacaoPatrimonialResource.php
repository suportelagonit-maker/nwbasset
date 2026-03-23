<?php

namespace App\Domain\Inventory\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConciliacaoPatrimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'inventario_id' => $this->inventario_id,
            'total_bens_sistema' => $this->total_bens_sistema,
            'total_bens_encontrados' => $this->total_bens_encontrados,
            'divergencias' => $this->divergencias,
            'data_conciliacao' => $this->data_conciliacao,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
