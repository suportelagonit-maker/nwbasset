<?php

namespace App\Domain\AssetRegistry\Models;

use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class BemPatrimonialImagem extends Model
{
    protected $table = 'bem_patrimonial_imagens';

    protected $fillable = [
        'bem_patrimonial_id',
        'empresa_id',
        'filial_id',
        'caminho_arquivo',
        'nome_original',
        'mime_type',
        'tamanho_bytes',
        'ordem',
        'principal',
    ];

    protected $appends = [
        'url',
    ];

    protected function casts(): array
    {
        return [
            'principal' => 'boolean',
            'tamanho_bytes' => 'integer',
            'ordem' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (self $imagem): void {
            Storage::disk('public')->delete($imagem->caminho_arquivo);
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
