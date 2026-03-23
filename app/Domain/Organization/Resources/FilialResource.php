<?php

namespace App\Domain\Organization\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FilialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'codigo' => $this->codigo,
            'nome' => $this->nome,
            'cnpj' => $this->cnpj,
            'matriz' => $this->matriz,
            'endereco' => $this->endereco,
            'cep' => $this->cep,
            'numero' => $this->numero,
            'complemento' => $this->complemento,
            'bairro' => $this->bairro,
            'cidade' => $this->cidade,
            'estado' => $this->estado,
            'status' => $this->status,
            'empresa' => $this->whenLoaded('empresa', fn () => [
                'id' => $this->empresa?->id,
                'nome_fantasia' => $this->empresa?->nome_fantasia,
                'razao_social' => $this->empresa?->razao_social,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
