<?php

namespace App\Domain\Inventory\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Local;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Uma leitura feita em campo durante o inventario, com o que o sistema
 * concluiu dela.
 */
class InventarioLeitura extends Model
{
    protected $table = 'inventario_leituras';

    protected $fillable = [
        'inventario_id',
        'bem_patrimonial_id',
        'local_id',
        'codigo_lido',
        'resultado',
        'origem_id',
        'lido_em',
        'lido_por',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'lido_em' => 'datetime',
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

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'local_id');
    }

    public function lidoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'lido_por');
    }
}
