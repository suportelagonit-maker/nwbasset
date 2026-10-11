<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepreciacaoBem extends Model
{
    protected $table = 'depreciacoes_bens';

    protected $fillable = [
        'bem_patrimonial_id',
        'empresa_id',
        'base_regra',
        'competencia',
        'valor_depreciacao_periodo',
        'metodo',
        'meses_depreciados',
        'regra_depreciacao_id',
        'fechado_em',
        'metodo_depreciacao_id',
        'valor_aquisicao',
        'valor_residual',
        'vida_util_anos',
        'taxa_anual',
        'valor_depreciado_acumulado',
        'valor_contabil',
        'data_calculo',
    ];

    protected function casts(): array
    {
        return [
            'valor_aquisicao' => 'decimal:2',
            'valor_residual' => 'decimal:2',
            'vida_util_anos' => 'integer',
            'taxa_anual' => 'decimal:4',
            'valor_depreciado_acumulado' => 'decimal:2',
            'valor_depreciacao_periodo' => 'decimal:2',
            'valor_contabil' => 'decimal:2',
            'meses_depreciados' => 'integer',
            'competencia' => 'date',
            'data_calculo' => 'date',
            'fechado_em' => 'datetime',
        ];
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function metodoDepreciacao(): BelongsTo
    {
        return $this->belongsTo(MetodoDepreciacao::class, 'metodo_depreciacao_id');
    }
}
