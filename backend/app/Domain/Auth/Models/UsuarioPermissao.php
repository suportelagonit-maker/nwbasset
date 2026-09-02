<?php

namespace App\Domain\Auth\Models;

use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsuarioPermissao extends Model
{
    protected $table = 'usuario_permissoes';

    protected $fillable = [
        'usuario_id',
        'empresa_id',
        'permissao',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }
}
