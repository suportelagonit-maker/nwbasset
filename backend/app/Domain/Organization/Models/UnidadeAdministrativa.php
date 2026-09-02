<?php

namespace App\Domain\Organization\Models;

use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnidadeAdministrativa extends Model
{
    protected $table = 'unidades_administrativas';

    protected static function booted(): void
    {
        static::created(function (UnidadeAdministrativa $unidadeAdministrativa): void {
            app(CodigoCadastroService::class)->aplicar($unidadeAdministrativa, 'UAD');
        });
    }

    protected $fillable = [
        'empresa_id',
        'filial_id',
        'nome',
        'codigo',
        'descricao',
        'status',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function filial(): BelongsTo
    {
        return $this->belongsTo(Filial::class, 'filial_id');
    }

    public function departamentos(): HasMany
    {
        return $this->hasMany(Departamento::class, 'unidade_administrativa_id');
    }

    public function locais(): HasMany
    {
        return $this->hasMany(Local::class, 'unidade_administrativa_id');
    }

    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'unidade_administrativa_id');
    }

    public function historicosLocalizacaoBens(): HasMany
    {
        return $this->hasMany(HistoricoLocalizacaoBem::class, 'unidade_administrativa_id');
    }

    public function transferenciasOrigem(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'origem_unidade_administrativa_id');
    }

    public function transferenciasDestino(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'destino_unidade_administrativa_id');
    }
}
