<?php

namespace App\Domain\AssetRegistry\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TipoProdutoResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'tipo_bem_id' => $this->tipo_bem_id,
            'tipo_bem' => $this->tipo_bem ?? null,
            'nome' => $this->nome,
            'descricao' => $this->descricao,
            'ativo' => $this->ativo,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
