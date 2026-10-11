<?php

namespace App\Domain\Inventory\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioItem extends Model
{
    protected $table = 'inventario_itens';

    protected $fillable = [
        'inventario_id',
        'bem_patrimonial_id',
        'localizado',
        'local_encontrado_id',
        'responsavel_encontrado_id',
        'contado_em',
        'contado_por',
        'codigo_lido',
        'data_verificacao',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'localizado' => 'boolean',
            'contado_em' => 'datetime',
            'data_verificacao' => 'date',
        ];
    }

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(Inventario::class, 'inventario_id');
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }

    public function localEncontrado(): BelongsTo
    {
        return $this->belongsTo(\App\Domain\Organization\Models\Local::class, 'local_encontrado_id');
    }

    public function responsavelEncontrado(): BelongsTo
    {
        return $this->belongsTo(\App\Domain\Organization\Models\Responsavel::class, 'responsavel_encontrado_id');
    }
}
