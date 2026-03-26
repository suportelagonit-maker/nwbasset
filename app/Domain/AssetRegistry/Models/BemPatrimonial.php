<?php

namespace App\Domain\AssetRegistry\Models;

use App\Domain\AssetMovements\Models\BaixaBem;
use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Models\ResponsabilidadeBem;
use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Models\ParametroDepreciacaoBem;
use App\Domain\Inventory\Models\DivergenciaInventario;
use App\Domain\Inventory\Models\InventarioItem;
use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Models\UnidadeAdministrativa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BemPatrimonial extends Model
{
    protected $table = 'bens_patrimoniais';

    protected $fillable = [
        'empresa_id',
        'filial_id',
        'unidade_administrativa_id',
        'departamento_id',
        'local_id',
        'responsavel_id',
        'numero_tombo',
        'numero_serie',
        'descricao',
        'categoria',
        'marca',
        'modelo',
        'data_aquisicao',
        'valor_aquisicao',
        'valor_residual',
        'vida_util_anos',
        'status_bem',
        'estado_conservacao',
    ];

    protected function casts(): array
    {
        return [
            'data_aquisicao' => 'date',
            'valor_aquisicao' => 'decimal:2',
            'valor_residual' => 'decimal:2',
            'vida_util_anos' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (self $bem): void {
            $bem->imagens()->get()->each->delete();
            $bem->documentos()->get()->each->delete();
        });
    }

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

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'local_id');
    }

    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(Responsavel::class, 'responsavel_id');
    }

    public function historicosLocalizacao(): HasMany
    {
        return $this->hasMany(HistoricoLocalizacaoBem::class, 'bem_patrimonial_id');
    }

    public function transferencias(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'bem_patrimonial_id');
    }

    public function baixas(): HasMany
    {
        return $this->hasMany(BaixaBem::class, 'bem_patrimonial_id');
    }

    public function responsabilidades(): HasMany
    {
        return $this->hasMany(ResponsabilidadeBem::class, 'bem_patrimonial_id');
    }

    public function depreciacoes(): HasMany
    {
        return $this->hasMany(DepreciacaoBem::class, 'bem_patrimonial_id');
    }

    public function parametrosDepreciacao(): HasMany
    {
        return $this->hasMany(ParametroDepreciacaoBem::class, 'bem_patrimonial_id')
            ->orderByDesc('ativo')
            ->orderByDesc('id');
    }

    public function inventarioItens(): HasMany
    {
        return $this->hasMany(InventarioItem::class, 'bem_patrimonial_id');
    }

    public function divergenciasInventario(): HasMany
    {
        return $this->hasMany(DivergenciaInventario::class, 'bem_patrimonial_id');
    }

    public function plaquetas(): HasMany
    {
        return $this->hasMany(PlaquetaPatrimonial::class, 'bem_patrimonial_id');
    }

    public function imagens(): HasMany
    {
        return $this->hasMany(BemPatrimonialImagem::class, 'bem_patrimonial_id')
            ->orderByDesc('principal')
            ->orderBy('ordem')
            ->orderBy('id');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(BemPatrimonialDocumento::class, 'bem_patrimonial_id')
            ->orderByDesc('id');
    }
}
