<?php

namespace App\Domain\Depreciation\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepreciacaoBemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bem_patrimonial_id' => $this->bem_patrimonial_id,
            'empresa_id' => $this->empresa_id,
            'metodo_depreciacao_id' => $this->metodo_depreciacao_id,
            'valor_aquisicao' => $this->valor_aquisicao,
            'valor_residual' => $this->valor_residual,
            'vida_util_anos' => $this->vida_util_anos,
            'taxa_anual' => $this->taxa_anual,
            'valor_depreciado_acumulado' => $this->valor_depreciado_acumulado,
            'valor_contabil' => $this->valor_contabil,
            'data_calculo' => $this->data_calculo,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
