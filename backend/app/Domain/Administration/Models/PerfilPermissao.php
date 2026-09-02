<?php

namespace App\Domain\Administration\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerfilPermissao extends Model
{
    protected $table = 'perfis_permissoes';
    public $timestamps = false;

    protected $fillable = [
        'perfil_id',
        'permissao_id',
    }

    public function perfil(): BelongsTo
    {
        return $this->belongsTo(Perfil::class, 'perfil_id');
    }

    public function permissao(): BelongsTo
    {
        return $this->belongsTo(Permissao::class, 'permissao_id');
    }
}
