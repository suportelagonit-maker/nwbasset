<?php

namespace App\Domain\AssetMovements\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BaixaBemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bem_patrimonial_id' => $this->bem_patrimonial_id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'data_baixa' => $this->data_baixa,
            'motivo_baixa' => $this->motivo_baixa,
            'valor_baixa' => $this->valor_baixa,
            'observacoes' => $this->observacoes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
