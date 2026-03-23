<?php

namespace App\Domain\AssetRegistry\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BemPatrimonialImagemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bem_patrimonial_id' => $this->bem_patrimonial_id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'nome_original' => $this->nome_original,
            'mime_type' => $this->mime_type,
            'tamanho_bytes' => $this->tamanho_bytes,
            'ordem' => $this->ordem,
            'principal' => $this->principal,
            'url' => $this->url,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
