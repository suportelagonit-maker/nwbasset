<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Producao apontada de um bem em um mes.
 *
 * Base do metodo de unidades produzidas: a quota do mes sai do quanto o bem
 * produziu, nao do tempo que passou.
 */
class ProducaoBem extends Model
{
    protected $table = 'producoes_bens';

    protected $fillable = [
        'empresa_id',
        'bem_patrimonial_id',
        'competencia',
        'unidades',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'competencia' => 'date',
            'unidades' => 'integer',
        ];
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }
}
