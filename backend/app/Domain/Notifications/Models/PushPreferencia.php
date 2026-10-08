<?php

namespace App\Domain\Notifications\Models;

use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushPreferencia extends Model
{
    protected $table = 'push_preferencias';

    protected $fillable = [
        'usuario_id',
        'assunto',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
