<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Fator de proporcionalidade do CIAP por competencia (saidas tributadas /
 * saidas totais). Sem registro para o mes, assume-se 1,0.
 */
class CiapFator extends Model
{
    protected $table = 'ciap_fatores';

    protected $fillable = [
        'empresa_id',
        'competencia',
        'saidas_tributadas',
        'saidas_totais',
        'fator',
    ];

    protected function casts(): array
    {
        return [
            'competencia' => 'date',
            'saidas_tributadas' => 'decimal:2',
            'saidas_totais' => 'decimal:2',
            'fator' => 'decimal:6',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}
