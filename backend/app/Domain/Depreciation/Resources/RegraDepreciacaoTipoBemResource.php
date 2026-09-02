<?php

namespace App\Domain\Depreciation\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegraDepreciacaoTipoBemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $taxaEfetiva = (float) ($this->taxa_anual_percentual ?? $this->taxa_anual ?? 0);
        $metodoCodigo = (string) ($this->metodo_depreciacao
            ?: match ($this->metodoDepreciacao?->codigo) {
                'SOMA_DIGITOS' => 'soma_digitos',
                'UNIDADES_PRODUZIDAS' => 'unidades_produzidas',
                default => 'linha_reta',
            });

        return [
            'id' => $this->id,
            'empresa_id' => $this->empresa_id,
            'tipo_bem_id' => $this->tipo_bem_id,
            'tipo_bem' => $this->tipo_bem,
            'nome_regra' => $this->nome_regra,
            'base_regra' => $this->base_regra,
            'metodo_depreciacao_id' => $this->metodo_depreciacao_id,
            'metodo_depreciacao' => $metodoCodigo,
            'vida_util_anos' => $this->vida_util_anos,
            'taxa_anual_percentual' => $taxaEfetiva,
            'taxa_anual' => $taxaEfetiva,
            'valor_residual_percentual' => $this->valor_residual_percentual,
            'depreciavel' => (bool) $this->depreciavel,
            'requer_override_manual' => (bool) $this->requer_override_manual,
            'data_inicio_vigencia' => optional($this->data_inicio_vigencia)->toDateString(),
            'data_fim_vigencia' => optional($this->data_fim_vigencia)->toDateString(),
            'ativo' => (bool) $this->ativo,
            'observacoes' => $this->observacoes,
            'metodo_depreciacao_objeto' => $this->whenLoaded('metodoDepreciacao', function (): ?array {
                if (! $this->metodoDepreciacao) {
                    return null;
                }

                return [
                    'id' => $this->metodoDepreciacao->id,
                    'nome' => $this->metodoDepreciacao->nome,
                    'codigo' => $this->metodoDepreciacao->codigo,
                ];
            }),
            'tipo_bem_objeto' => $this->whenLoaded('tipoBemPatrimonial', function (): ?array {
                if (! $this->tipoBemPatrimonial) {
                    return null;
                }

                return [
                    'id' => $this->tipoBemPatrimonial->id,
                    'nome' => $this->tipoBemPatrimonial->nome,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
