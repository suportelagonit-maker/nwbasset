<?php

namespace App\Domain\Organization\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResponsavelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'departamento_id' => $this->departamento_id,
            'nome' => $this->nome,
            'matricula' => $this->matricula,
            'cpf' => $this->cpf,
            'email' => $this->email,
            'telefone' => $this->telefone,
            'cargo' => $this->cargo,
            'status' => $this->status,
            'departamento_nome' => $this->whenLoaded('departamento', fn () => $this->departamento?->nome),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
