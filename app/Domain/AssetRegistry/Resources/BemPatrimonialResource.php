<?php

namespace App\Domain\AssetRegistry\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BemPatrimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'filial_id' => $this->filial_id,
            'unidade_administrativa_id' => $this->unidade_administrativa_id,
            'departamento_id' => $this->departamento_id,
            'local_id' => $this->local_id,
            'responsavel_id' => $this->responsavel_id,
            'numero_tombo' => $this->numero_tombo,
            'numero_serie' => $this->numero_serie,
            'descricao' => $this->descricao,
            'categoria' => $this->categoria,
            'marca' => $this->marca,
            'modelo' => $this->modelo,
            'data_aquisicao' => $this->data_aquisicao,
            'valor_aquisicao' => $this->valor_aquisicao,
            'valor_residual' => $this->valor_residual,
            'vida_util_anos' => $this->vida_util_anos,
            'status_bem' => $this->status_bem,
            'estado_conservacao' => $this->estado_conservacao,
            'imagem_principal_url' => $this->whenLoaded('imagens', fn () => $this->imagens->first()?->url),
            'imagens' => BemPatrimonialImagemResource::collection($this->whenLoaded('imagens')),
            'documentos' => BemPatrimonialDocumentoResource::collection($this->whenLoaded('documentos')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
