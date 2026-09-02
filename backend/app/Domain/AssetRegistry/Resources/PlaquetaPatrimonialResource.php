<?php

namespace App\Domain\AssetRegistry\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlaquetaPatrimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing(['bemPatrimonial', 'filial']);

        return [
            'id' => $this->id,
            'bem_patrimonial_id' => $this->bem_patrimonial_id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'codigo_plaqueta' => $this->codigo_plaqueta,
            'numero_plaqueta' => $this->numero_plaqueta,
            'codigo_barras_conteudo' => $this->codigo_barras_conteudo,
            'link_consulta' => $this->link_consulta,
            'qr_code_conteudo' => $this->qr_code_conteudo,
            'status' => $this->status?->value ?? $this->status,
            'data_geracao' => $this->data_geracao,
            'data_aplicacao' => $this->data_aplicacao,
            'observacoes' => $this->observacoes,
            'bem_patrimonial_descricao' => $this->bemPatrimonial?->descricao,
            'bem_patrimonial_numero_tombo' => $this->bemPatrimonial?->numero_tombo,
            'filial_nome' => $this->filial?->nome,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
