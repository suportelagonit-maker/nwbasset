<?php

namespace App\Domain\Organization\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'unidade_administrativa_id' => $this->unidade_administrativa_id,
            'departamento_id' => $this->departamento_id,
            'nome' => $this->nome,
            'codigo' => $this->codigo,
            'endereco' => $this->endereco,
            'descricao' => $this->descricao,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
