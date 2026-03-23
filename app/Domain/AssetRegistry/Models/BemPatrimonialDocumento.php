<?php

namespace App\Domain\AssetRegistry\Models;

use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class BemPatrimonialDocumento extends Model
{
    protected $table = 'bem_patrimonial_documentos';

    protected $fillable = [
        'bem_patrimonial_id',
        'empresa_id',
        'filial_id',
        'tipo_documento',
        'caminho_arquivo',
        'nome_original',
        'mime_type',
        'tamanho_bytes',
    ];

    protected $appends = [
        'url',
    ];

    protected static function booted(): void
    {
        static::deleting(function (self $documento): void {
            Storage::disk('public')->delete($documento->caminho_arquivo);
        });
    }

    public function bemPatrimonial(): BelongsTo
    {
        return $this->belongsTo(BemPatrimonial::class, 'bem_patrimonial_id');
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function filial(): BelongsTo
    {
        return $this->belongsTo(Filial::class, 'filial_id');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->caminho_arquivo);
    }
}
