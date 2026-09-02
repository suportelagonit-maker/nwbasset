<?php

namespace App\Domain\Organization\Models;

use App\Domain\AssetMovements\Models\BaixaBem;
use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Models\ResponsabilidadeBem;
use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Filial extends Model
{
    protected $table = 'filiais';

    protected static function booted(): void
    {
        static::created(function (Filial $filial): void {
            app(CodigoCadastroService::class)->aplicar($filial, $filial->matriz ? 'MAT' : 'FIL');
        });
    }

    protected $fillable = [
        'empresa_id',
        'nome',
        'codigo',
        'cnpj',
        'matriz',
        'endereco',
        'cep',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'estado',
        'status',
    ];

    protected $casts = [
        'matriz' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function unidadesAdministrativas(): HasMany
    {
        return $this->hasMany(UnidadeAdministrativa::class, 'filial_id');
    }

    public function departamentos(): HasMany
    {
        return $this->hasMany(Departamento::class, 'filial_id');
    }

    public function locais(): HasMany
    {
        return $this->hasMany(Local::class, 'filial_id');
    }

    public function responsaveis(): HasMany
    {
        return $this->hasMany(Responsavel::class, 'filial_id');
    }

    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'filial_id');
    }

    public function historicosLocalizacaoBens(): HasMany
    {
        return $this->hasMany(HistoricoLocalizacaoBem::class, 'filial_id');
    }

    public function transferenciasBens(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'filial_id');
    }

    public function baixasBens(): HasMany
    {
        return $this->hasMany(BaixaBem::class, 'filial_id');
    }

    public function responsabilidadeBens(): HasMany
    {
        return $this->hasMany(ResponsabilidadeBem::class, 'filial_id');
    }

    public function inventarios(): HasMany
    {
        return $this->hasMany(Inventario::class, 'filial_id');
    }

    public function plaquetasPatrimoniais(): HasMany
    {
        return $this->hasMany(PlaquetaPatrimonial::class, 'filial_id');
    }
}
