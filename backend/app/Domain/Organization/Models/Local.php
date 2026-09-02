<?php

namespace App\Domain\Organization\Models;

use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Local extends Model
{
    protected $table = 'locais';

    protected static function booted(): void
    {
        static::created(function (Local $local): void {
            app(CodigoCadastroService::class)->aplicar($local, 'LOC');
        });
    }

    protected $fillable = [
        'empresa_id',
        'filial_id',
        'unidade_administrativa_id',
        'departamento_id',
        'nome',
        'codigo',
        'endereco',
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

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class, 'departamento_id');
    }

    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'local_id');
    }

    public function historicosLocalizacaoBens(): HasMany
    {
        return $this->hasMany(HistoricoLocalizacaoBem::class, 'local_id');
    }

    public function transferenciasOrigem(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'origem_local_id');
    }

    public function transferenciasDestino(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'destino_local_id');
    }
}
