<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Competencia fechada: o mes ja foi para o balancete e nao e mais
 * recalculado sozinho.
 */
class FechamentoDepreciacao extends Model
{
    protected $table = 'fechamentos_depreciacao';

    protected $fillable = [
        'empresa_id',
        'base_regra',
        'competencia',
        'bens_processados',
        'valor_total',
        'fechado_em',
        'fechado_por',
        'reaberto_em',
        'reaberto_por',
        'motivo_reabertura',
    ];

    protected function casts(): array
    {
        return [
            'competencia' => 'date',
            'fechado_em' => 'datetime',
            'reaberto_em' => 'datetime',
            'valor_total' => 'decimal:2',
            'bens_processados' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function fechadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'fechado_por');
    }

    /** Fechado e ainda nao reaberto. */
    public function estaFechado(): bool
    {
        return $this->fechado_em !== null && $this->reaberto_em === null;
    }
}
