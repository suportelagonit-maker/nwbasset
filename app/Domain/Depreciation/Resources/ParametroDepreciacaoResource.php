<?php

namespace App\Domain\Depreciation\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ParametroDepreciacaoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'metodo_depreciacao_id' => $this->metodo_depreciacao_id,
            'vida_util_padrao' => $this->vida_util_padrao,
            'taxa_padrao' => $this->taxa_padrao,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
