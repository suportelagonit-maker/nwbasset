<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventoValorBem extends Model
{
    protected $table = 'eventos_valor_bens';

    protected $fillable = [
        'empresa_id',
        'bem_patrimonial_id',
        'tipo',
        'competencia',
        'valor',
        'nova_vida_util_meses',
        'descricao',
        'criado_por',
    ];

    protected function casts(): array
    {
        return [
            'competencia' => 'date',
            'valor' => 'decimal:2',
            'nova_vida_util_meses' => 'integer',
        ];
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }

    public function criadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'criado_por');
    }
}
