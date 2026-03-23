<?php

namespace App\Domain\Inventory\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DivergenciaInventario extends Model
{
    protected $table = 'divergencias_inventario';

    protected $fillable = [
        'inventario_id',
        'bem_patrimonial_id',
        'tipo_divergencia',
        'descricao',
    ];

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(Inventario::class, 'inventario_id');
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }
}
