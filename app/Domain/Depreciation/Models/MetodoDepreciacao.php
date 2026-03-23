<?php

namespace App\Domain\Depreciation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetodoDepreciacao extends Model
{
    protected $table = 'metodos_depreciacao';

    protected $fillable = [
        'nome',
        'codigo',
        'descricao',
    ];

    public function parametrosDepreciacao(): HasMany
    {
        return $this->hasMany(ParametroDepreciacao::class, 'metodo_depreciacao_id');
    }

    public function depreciacoesBens(): HasMany
    {
        return $this->hasMany(DepreciacaoBem::class, 'metodo_depreciacao_id');
    }
}
