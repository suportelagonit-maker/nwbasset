<?php

namespace App\Domain\Administration\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permissao extends Model
{
    protected $table = 'permissoes';
    public $timestamps = false;

    protected $fillable = [
        'nome',
        'chave',
    ];

    public function perfis(): BelongsToMany
    {
        return $this->belongsToMany(Perfil::class, 'perfis_permissoes', 'permissao_id', 'perfil_id');
    }
}
