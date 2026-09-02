<?php

namespace App\Domain\Administration\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissaoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'grupo' => $this->grupo,
            'codigo' => $this->codigo,
            'nome' => $this->nome,
            'descricao' => $this->descricao,
            'status' => $this->status,
            'sistema' => $this->sistema,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
