<?php

namespace App\Domain\MultiCompany\Models;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsuarioFilial extends Model
{
    protected $table = 'usuario_filiais';

    protected $fillable = [
        'empresa_id',
        'usuario_id',
        'filial_id',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function filial(): BelongsTo
    {
        return $this->belongsTo(Filial::class, 'filial_id');
    }
}
