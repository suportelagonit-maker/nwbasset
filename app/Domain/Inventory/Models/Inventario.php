<?php

namespace App\Domain\Inventory\Models;

use App\Domain\Audit\Models\AuditoriaPatrimonial;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Inventario extends Model
{
    protected $table = 'inventarios';

    protected $fillable = [
        'empresa_id',
        'filial_id',
        'nome',
        'data_inicio',
        'data_fim',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'data_inicio' => 'date',
            'data_fim' => 'date',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function filial(): BelongsTo
    {
        return $this->belongsTo(Filial::class, 'filial_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(InventarioItem::class, 'inventario_id');
    }

    public function conciliacao(): HasOne
    {
        return $this->hasOne(ConciliacaoPatrimonial::class, 'inventario_id');
    }

    public function divergencias(): HasMany
    {
        return $this->hasMany(DivergenciaInventario::class, 'inventario_id');
    }

    public function auditoriasPatrimoniais(): HasMany
    {
        return $this->hasMany(AuditoriaPatrimonial::class, 'inventario_id');
    }
}
