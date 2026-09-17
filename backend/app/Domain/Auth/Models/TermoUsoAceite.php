<?php

namespace App\Domain\Auth\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TermoUsoAceite extends Model
{
    protected $table = 'termo_uso_aceites';

    protected $fillable = [
        'usuario_id',
        'versao',
        'hash_conteudo',
        'nome_usuario',
        'email_usuario',
        'aceito_em',
        'ip',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'aceito_em' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
