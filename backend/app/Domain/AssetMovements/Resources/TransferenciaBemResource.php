<?php

namespace App\Domain\AssetMovements\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferenciaBemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bem_patrimonial_id' => $this->bem_patrimonial_id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'origem_unidade_administrativa_id' => $this->origem_unidade_administrativa_id,
            'origem_departamento_id' => $this->origem_departamento_id,
            'origem_local_id' => $this->origem_local_id,
            'origem_responsavel_id' => $this->origem_responsavel_id,
            'destino_unidade_administrativa_id' => $this->destino_unidade_administrativa_id,
            'destino_departamento_id' => $this->destino_departamento_id,
            'destino_local_id' => $this->destino_local_id,
            'destino_responsavel_id' => $this->destino_responsavel_id,
            'data_transferencia' => $this->data_transferencia,
            'motivo' => $this->motivo,
            'observacoes' => $this->observacoes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
