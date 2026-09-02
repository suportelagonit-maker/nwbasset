<?php

namespace App\Domain\Depreciation\Models;

use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoBemPatrimonial extends Model
{
    protected $table = 'tipos_bens_patrimoniais';

    protected $fillable = [
        'empresa_id',
        'nome',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function regrasDepreciacao(): HasMany
    {
        return $this->hasMany(RegraDepreciacaoTipoBem::class, 'tipo_bem_id');
    }
}
