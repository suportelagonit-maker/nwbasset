<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParametroDepreciacaoBem extends Model
{
    protected $table = 'parametros_depreciacao_bens';

    protected $fillable = [
        'empresa_id',
        'bem_patrimonial_id',
        'regra_depreciacao_id',
        'base_regra_aplicada',
        'metodo_depreciacao',
        'metodo_depreciacao_id',
        'vida_util_anos',
        'taxa_anual_percentual',
        'valor_residual_percentual',
        'valor_residual_monetario',
        'data_inicio_depreciacao',
        'depreciavel',
        'motivo_override',
        'origem_parametro',
        'ativo',
        'criado_por',
        'atualizado_por',
    ];

    protected function casts(): array
    {
        return [
            'vida_util_anos' => 'integer',
            'taxa_anual_percentual' => 'decimal:4',
            'valor_residual_percentual' => 'decimal:4',
            'valor_residual_monetario' => 'decimal:2',
            'data_inicio_depreciacao' => 'date',
            'depreciavel' => 'boolean',
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }

    public function regraDepreciacao(): BelongsTo
    {
        return $this->belongsTo(RegraDepreciacaoTipoBem::class, 'regra_depreciacao_id');
    }

    public function metodoDepreciacaoLegacy(): BelongsTo
    {
        return $this->belongsTo(MetodoDepreciacao::class, 'metodo_depreciacao_id');
    }
}

