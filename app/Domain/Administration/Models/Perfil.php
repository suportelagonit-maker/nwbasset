<?php

namespace App\Domain\Administration\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Perfil extends Model
{
    protected $table = 'perfis';
    public $timestamps = false;

    protected $fillable = [
        'nome',
        'descricao',
    ];

    public function permissoes(): BelongsToMany
    {
        return $this->belongsToMany(Permissao::class, 'perfis_permissoes', 'perfil_id', 'permissao_id');
    }
}
