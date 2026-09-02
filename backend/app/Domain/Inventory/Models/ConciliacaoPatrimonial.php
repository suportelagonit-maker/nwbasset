<?php

namespace App\Domain\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConciliacaoPatrimonial extends Model
{
    protected $table = 'conciliacoes_patrimoniais';

    protected $fillable = [
        'inventario_id',
        'total_bens_sistema',
        'total_bens_encontrados',
        'divergencias',
        'data_conciliacao',
    ];

    protected function casts(): array
    {
        return [
            'total_bens_sistema' => 'integer',
            'total_bens_encontrados' => 'integer',
            'divergencias' => 'integer',
            'data_conciliacao' => 'date',
        ];
    }

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(Inventario::class, 'inventario_id');
    }
}
