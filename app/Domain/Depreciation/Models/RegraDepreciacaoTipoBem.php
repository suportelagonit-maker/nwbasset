<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegraDepreciacaoTipoBem extends Model
{
    protected $table = 'regras_depreciacao_tipos_bens';

    protected $fillable = [
        'empresa_id',
        'tipo_bem_id',
        'tipo_bem',
        'nome_regra',
        'base_regra',
        'metodo_depreciacao_id',
        'metodo_depreciacao',
        'vida_util_anos',
        'taxa_anual',
        'taxa_anual_percentual',
        'valor_residual_percentual',
        'depreciavel',
        'requer_override_manual',
        'data_inicio_vigencia',
        'data_fim_vigencia',
        'ativo',
        'observacoes',
        'criado_por',
        'atualizado_por',
    ];

    protected function casts(): array
    {
        return [
            'tipo_bem_id' => 'integer',
            'vida_util_anos' => 'integer',
            'taxa_anual' => 'decimal:4',
            'taxa_anual_percentual' => 'decimal:4',
            'valor_residual_percentual' => 'decimal:4',
            'depreciavel' => 'boolean',
            'requer_override_manual' => 'boolean',
            'data_inicio_vigencia' => 'date',
            'data_fim_vigencia' => 'date',
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function metodoDepreciacao(): BelongsTo
    {
        return $this->belongsTo(MetodoDepreciacao::class, 'metodo_depreciacao_id');
    }

    public function tipoBemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(TipoBemPatrimonial::class, 'tipo_bem_id');
    }

    public function getTaxaAnualEfetivaAttribute(): float
    {
        return (float) ($this->taxa_anual_percentual ?? $this->taxa_anual ?? 0);
    }

    public function scopeAtivasVigentes($query, ?string $dataReferencia = null)
    {
        $data = $dataReferencia ?: now()->toDateString();

        return $query
            ->where('ativo', true)
            ->whereDate('data_inicio_vigencia', '<=', $data)
            ->where(function ($q) use ($data): void {
                $q->whereNull('data_fim_vigencia')
                    ->orWhereDate('data_fim_vigencia', '>=', $data);
            });
    }
}
