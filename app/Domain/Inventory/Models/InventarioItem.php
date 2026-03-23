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
        'data_verificacao',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'localizado' => 'boolean',
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
}
