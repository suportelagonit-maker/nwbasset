<?php

namespace App\Domain\Auth\Models;

use App\Domain\Administration\Models\Perfil;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsuarioPerfil extends Model
{
    protected $table = 'usuario_perfis';

    protected $fillable = [
        'empresa_id',
        'usuario_id',
        'perfil_id',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function perfil(): BelongsTo
    {
        return $this->belongsTo(Perfil::class, 'perfil_id');
    }
}
