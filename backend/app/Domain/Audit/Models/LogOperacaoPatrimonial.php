<?php

namespace App\Domain\Audit\Models;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogOperacaoPatrimonial extends Model
{
    protected $table = 'logs_operacoes_patrimoniais';

    public const UPDATED_AT = null;

    protected $fillable = [
        'empresa_id',
        'usuario_id',
        'operacao',
        'entidade',
        'entidade_id',
        'dados_anteriores',
        'dados_novos',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'dados_anteriores' => 'array',
            'dados_novos' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
