<?php

namespace App\Domain\AssetMovements\Models;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Responsavel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResponsabilidadeBem extends Model
{
    protected $table = 'responsabilidade_bens';

    protected $fillable = [
        'bem_patrimonial_id',
        'empresa_id',
        'filial_id',
        'responsavel_id',
        'data_inicio',
        'data_fim',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'data_inicio' => 'date',
            'data_fim' => 'date',
        ];
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function filial(): BelongsTo
    {
        return $this->belongsTo(Filial::class, 'filial_id');
    }

    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(Responsavel::class, 'responsavel_id');
    }
}
