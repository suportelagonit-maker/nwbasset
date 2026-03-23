<?php

namespace App\Domain\Organization\Models;

use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Departamento extends Model
{
    protected $table = 'departamentos';

    protected static function booted(): void
    {
        static::created(function (Departamento $departamento): void {
            app(CodigoCadastroService::class)->aplicar($departamento, 'DEP');
        });
    }

    protected $fillable = [
        'empresa_id',
        'filial_id',
        'unidade_administrativa_id',
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

    public function unidadeAdministrativa(): BelongsTo
    {
        return $this->belongsTo(UnidadeAdministrativa::class, 'unidade_administrativa_id');
    }

    public function locais(): HasMany
    {
        return $this->hasMany(Local::class, 'departamento_id');
    }

    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'departamento_id');
    }

    public function historicosLocalizacaoBens(): HasMany
    {
        return $this->hasMany(HistoricoLocalizacaoBem::class, 'departamento_id');
    }

    public function transferenciasOrigem(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'origem_departamento_id');
    }

    public function transferenciasDestino(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'destino_departamento_id');
    }
}
