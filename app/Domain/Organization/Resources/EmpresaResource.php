<?php

namespace App\Domain\Organization\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmpresaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'codigo' => $this->codigo,
            'razao_social' => $this->razao_social,
            'nome_fantasia' => $this->nome_fantasia,
            'cnpj' => $this->cnpj,
            'logo_url' => $this->logo_url,
            'email' => $this->email,
            'telefone' => $this->telefone,
            'cep' => $this->cep,
            'endereco' => $this->endereco,
            'numero' => $this->numero,
            'complemento' => $this->complemento,
            'bairro' => $this->bairro,
            'cidade' => $this->cidade,
            'estado' => $this->estado,
            'timezone' => $this->timezone,
            'status' => $this->status,
            'filiais_count' => $this->whenCounted('filiais'),
            'filiais' => FilialResource::collection($this->whenLoaded('filiais')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
