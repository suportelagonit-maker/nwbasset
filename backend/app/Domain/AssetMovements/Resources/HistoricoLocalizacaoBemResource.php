<?php

namespace App\Domain\AssetMovements\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HistoricoLocalizacaoBemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bem_patrimonial_id' => $this->bem_patrimonial_id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'unidade_administrativa_id' => $this->unidade_administrativa_id,
            'departamento_id' => $this->departamento_id,
            'local_id' => $this->local_id,
            'data_inicio' => $this->data_inicio,
            'data_fim' => $this->data_fim,
            'observacoes' => $this->observacoes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
