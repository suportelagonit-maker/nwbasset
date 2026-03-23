<?php

namespace App\Domain\Audit\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditoriaPatrimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'inventario_id' => $this->inventario_id,
            'data_auditoria' => $this->data_auditoria,
            'auditor' => $this->auditor,
            'observacoes' => $this->observacoes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
