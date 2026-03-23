<?php

namespace App\Domain\MultiCompany\Models;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsuarioEmpresa extends Model
{
    protected $table = 'usuarios_empresas';
    const UPDATED_AT = null;

    protected $fillable = [
        'usuario_id',
        'empresa_id',
        'perfil',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
