<?php

namespace App\Domain\Audit\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditoriaEventoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'usuario_id' => $this->usuario_id,
            'usuario_nome' => $this->usuario?->nome,
            'evento' => $this->evento,
            'entidade_tipo' => $this->entidade_tipo,
            'entidade_id' => $this->entidade_id,
            'descricao' => $this->descricao,
            'dados_anteriores' => $this->dados_anteriores,
            'dados_novos' => $this->dados_novos,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'created_at' => $this->created_at,
        ];
    }
}
