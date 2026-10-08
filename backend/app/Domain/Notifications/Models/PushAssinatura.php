<?php

namespace App\Domain\Notifications\Models;

use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushAssinatura extends Model
{
    protected $table = 'push_assinaturas';

    protected $fillable = [
        'usuario_id',
        'endpoint',
        'endpoint_hash',
        'p256dh',
        'auth',
        'user_agent',
        'falhas',
        'ultimo_envio_em',
    ];

    protected function casts(): array
    {
        return [
            'falhas' => 'integer',
            'ultimo_envio_em' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public static function hashDoEndpoint(string $endpoint): string
    {
        return hash('sha256', $endpoint);
    }
}
