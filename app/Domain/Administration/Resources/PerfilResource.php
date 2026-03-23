<?php

namespace App\Domain\Administration\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PerfilResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'codigo' => $this->codigo,
            'nome' => $this->nome,
            'descricao' => $this->descricao,
            'status' => $this->status,
            'sistema' => $this->sistema,
            'permissoes' => PermissaoResource::collection($this->whenLoaded('permissoes')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
