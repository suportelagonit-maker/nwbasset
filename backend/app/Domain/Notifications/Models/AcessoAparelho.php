<?php

namespace App\Domain\Notifications\Models;

use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcessoAparelho extends Model
{
    protected $table = 'acessos_aparelhos';

    protected $fillable = [
        'usuario_id',
        'impressao',
        'user_agent',
        'ultimo_ip',
        'visto_primeiro_em',
        'visto_ultimo_em',
    ];

    protected function casts(): array
    {
        return [
            'visto_primeiro_em' => 'datetime',
            'visto_ultimo_em' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    /**
     * Impressao grosseira do aparelho: so o navegador e o sistema, sem
     * versao de build nem IP. Atualizacao do Chrome nao pode virar "aparelho
     * novo", senao o aviso perde o sentido de tanto repetir.
     */
    public static function impressaoDe(?string $userAgent): string
    {
        $base = mb_strtolower(trim((string) $userAgent));

        if ($base === '') {
            return hash('sha256', 'desconhecido');
        }

        // Remove numeros de versao: "Chrome/131.0.6778.86" -> "Chrome/".
        $semVersoes = preg_replace('/\d+(\.\d+)*/', '', $base) ?? $base;

        return hash('sha256', preg_replace('/\s+/', ' ', trim($semVersoes)) ?? $semVersoes);
    }
}
