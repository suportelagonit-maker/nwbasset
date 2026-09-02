<?php

namespace App\Domain\Organization\Models;

use App\Domain\Audit\Models\AuditoriaPatrimonial;
use App\Domain\Audit\Models\LogOperacaoPatrimonial;
use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use App\Domain\AssetMovements\Models\BaixaBem;
use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Models\ResponsabilidadeBem;
use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Models\ParametroDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacaoBem;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Shared\Services\CodigoCadastroService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Empresa extends Model
{
    protected $table = 'empresas';

    protected $appends = [
        'logo_url',
    ];

    protected static function booted(): void
    {
        static::created(function (Empresa $empresa): void {
            app(CodigoCadastroService::class)->aplicar($empresa, 'EMP');
        });

        static::deleting(function (Empresa $empresa): void {
            if ($empresa->logo_path) {
                Storage::disk('public')->delete($empresa->logo_path);
            }
        });
    }

    protected $fillable = [
        'codigo',
        'razao_social',
        'nome_fantasia',
        'cnpj',
        'inscricao_estadual',
        'email',
        'telefone',
        'logo_path',
        'cep',
        'endereco',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'estado',
        'status',
    ];

    public function filiais(): HasMany
    {
        return $this->hasMany(Filial::class, 'empresa_id');
    }

    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'usuarios_empresas', 'empresa_id', 'usuario_id')
            ->withPivot(['perfil', 'created_at']);
    }

    public function unidadesAdministrativas(): HasMany
    {
        return $this->hasMany(UnidadeAdministrativa::class, 'empresa_id');
    }

    public function departamentos(): HasMany
    {
        return $this->hasMany(Departamento::class, 'empresa_id');
    }

    public function locais(): HasMany
    {
        return $this->hasMany(Local::class, 'empresa_id');
    }

    public function responsaveis(): HasMany
    {
        return $this->hasMany(Responsavel::class, 'empresa_id');
    }

    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'empresa_id');
    }

    public function historicosLocalizacaoBens(): HasMany
    {
        return $this->hasMany(HistoricoLocalizacaoBem::class, 'empresa_id');
    }

    public function transferenciasBens(): HasMany
    {
        return $this->hasMany(TransferenciaBem::class, 'empresa_id');
    }

    public function baixasBens(): HasMany
    {
        return $this->hasMany(BaixaBem::class, 'empresa_id');
    }

    public function responsabilidadeBens(): HasMany
    {
        return $this->hasMany(ResponsabilidadeBem::class, 'empresa_id');
    }

    public function parametrosDepreciacao(): HasMany
    {
        return $this->hasMany(ParametroDepreciacao::class, 'empresa_id');
    }

    public function parametrosDepreciacaoBens(): HasMany
    {
        return $this->hasMany(ParametroDepreciacaoBem::class, 'empresa_id');
    }

    public function regrasDepreciacaoTiposBens(): HasMany
    {
        return $this->hasMany(RegraDepreciacaoTipoBem::class, 'empresa_id');
    }

    public function depreciacoesBens(): HasMany
    {
        return $this->hasMany(DepreciacaoBem::class, 'empresa_id');
    }

    public function inventarios(): HasMany
    {
        return $this->hasMany(Inventario::class, 'empresa_id');
    }

    public function logsOperacoesPatrimoniais(): HasMany
    {
        return $this->hasMany(LogOperacaoPatrimonial::class, 'empresa_id');
    }

    public function auditoriasPatrimoniais(): HasMany
    {
        return $this->hasMany(AuditoriaPatrimonial::class, 'empresa_id');
    }

    public function plaquetasPatrimoniais(): HasMany
    {
        return $this->hasMany(PlaquetaPatrimonial::class, 'empresa_id');
    }

    public function getLogoUrlAttribute(): ?string
    {
        if (!$this->logo_path) {
            return null;
        }

        return Storage::disk('public')->url($this->logo_path);
    }
}
