<?php

namespace App\Domain\Audit\Models;

use App\Domain\Inventory\Models\Inventario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditoriaPatrimonial extends Model
{
    protected $table = 'auditorias_patrimoniais';

    protected $fillable = [
        'empresa_id',
        'inventario_id',
        'data_auditoria',
        'auditor',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_auditoria' => 'date',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(Inventario::class, 'inventario_id');
    }
}
