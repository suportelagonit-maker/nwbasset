<?php

namespace App\Domain\Auth\Models;

use App\Domain\Audit\Models\LogOperacaoPatrimonial;
use App\Domain\Auth\Enums\RoleEnum;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Builder;

class Usuario extends Authenticatable
{
    use HasApiTokens;
    use Notifiable;

    protected $table = 'usuarios';

    protected $fillable = [
        'empresa_id',
        'nome',
        'email',
        'nwb_sub',
        'auth_origem',
        'password',
        'role',
        'ativo',
        'ultimo_login_em',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'ativo' => 'boolean',
            'ultimo_login_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function termoUsoAceites(): HasMany
    {
        return $this->hasMany(TermoUsoAceite::class, 'usuario_id');
    }

    public function empresas(): BelongsToMany
    {
        return $this->belongsToMany(Empresa::class, 'usuarios_empresas', 'usuario_id', 'empresa_id')
            ->withPivot(['perfil', 'created_at']);
    }

    public function filiais(): BelongsToMany
    {
        return $this->belongsToMany(Filial::class, 'usuario_filiais', 'usuario_id', 'filial_id');
    }

    public function empresaPadrao(): ?Empresa
    {
        if ($this->canAccessAllEmpresas()) {
            return Empresa::query()->orderBy('nome_fantasia')->first();
        }

        if ($this->empresa_id !== null) {
            return $this->relationLoaded('empresa') ? $this->empresa : $this->empresa()->first();
        }

        return $this->relationLoaded('empresas') ? $this->empresas->first() : $this->empresas()->first();
    }

    public function isSuperAdmin(): bool
    {
        return $this->normalizeRole($this->role ?: RoleEnum::OPERADOR_INVENTARIO->value) === RoleEnum::SUPER_ADMIN->value;
    }

    public function isUltraAdmin(): bool
    {
        $targetEmail = strtolower(trim((string) env('ULTRA_ADMIN_EMAIL', 'admin@nwbasset.local')));

        return strtolower(trim((string) $this->email)) === $targetEmail;
    }

    public function canBeManagedBy(?self $actor): bool
    {
        if (! $this->isUltraAdmin()) {
            return true;
        }

        if (! $actor instanceof self) {
            return false;
        }

        return (int) $actor->id === (int) $this->id;
    }

    public function empresasAcessiveisQuery(): Builder
    {
        if ($this->canAccessAllEmpresas()) {
            return Empresa::query()->orderBy('nome_fantasia');
        }

        return $this->empresas()->getQuery()->orderBy('nome_fantasia');
    }

    public function empresasAcessiveis(): EloquentCollection
    {
        if ($this->relationLoaded('empresas') && ! $this->isSuperAdmin()) {
            /** @var EloquentCollection $empresas */
            $empresas = $this->empresas->sortBy('nome_fantasia')->values();

            return $empresas;
        }

        return $this->empresasAcessiveisQuery()->get();
    }

    public function roleForEmpresa(?int $empresaId = null): string
    {
        if ($this->isSuperAdmin()) {
            return RoleEnum::SUPER_ADMIN->value;
        }

        $empresaId ??= $this->empresaPadrao()?->id;

        if ($empresaId !== null) {
            $empresa = $this->relationLoaded('empresas')
                ? $this->empresas->firstWhere('id', $empresaId)
                : $this->empresas()->where('empresas.id', $empresaId)->first();

            $perfil = $empresa?->pivot?->perfil;

            if (is_string($perfil) && $perfil !== '') {
                return $this->normalizeRole($perfil);
            }
        }

        return $this->normalizeRole($this->role ?: RoleEnum::OPERADOR_INVENTARIO->value);
    }

    public function pertenceAEmpresa(int $empresaId): bool
    {
        if ($this->canAccessAllEmpresas()) {
            return Empresa::query()->whereKey($empresaId)->exists();
        }

        if ($this->empresa_id === $empresaId) {
            return true;
        }

        if ($this->relationLoaded('empresas')) {
            return $this->empresas->contains('id', $empresaId);
        }

        return $this->empresas()->where('empresas.id', $empresaId)->exists();
    }

    public function temAlgumaPermissao(array $permissoes, ?int $empresaId = null): bool
    {
        $role = $this->roleForEmpresa($empresaId);

        if ($role === RoleEnum::SUPER_ADMIN->value) {
            return true;
        }

        $permissoes = collect($permissoes)
            ->filter(fn ($item) => is_string($item) && $item !== '')
            ->values();

        if ($permissoes->isEmpty()) {
            return false;
        }

        $permissoesDiretas = collect($this->permissoesDiretasLista($empresaId));

        if ($permissoesDiretas->isNotEmpty()) {
            return $permissoesDiretas
                ->intersect($permissoes)
                ->isNotEmpty();
        }

        return RolePermissao::query()
            ->where('role', $role)
            ->whereIn('permissao', $permissoes->all())
            ->exists();
    }

    public function logsOperacoesPatrimoniais(): HasMany
    {
        return $this->hasMany(LogOperacaoPatrimonial::class, 'usuario_id');
    }

    public function permissoesDiretas(): HasMany
    {
        return $this->hasMany(UsuarioPermissao::class, 'usuario_id');
    }

    public function permissoesDiretasLista(?int $empresaId = null): array
    {
        $empresaId ??= $this->empresaPadrao()?->id;

        if ($empresaId === null) {
            return [];
        }

        return $this->permissoesDiretas()
            ->where('empresa_id', $empresaId)
            ->orderBy('permissao')
            ->pluck('permissao')
            ->unique()
            ->values()
            ->all();
    }

    private function normalizeRole(string $role): string
    {
        $normalized = strtoupper(trim($role));

        if ($normalized === 'ADMIN') {
            return RoleEnum::ADMIN_EMPRESA->value;
        }

        return in_array($normalized, RoleEnum::values(), true)
            ? $normalized
            : RoleEnum::OPERADOR_INVENTARIO->value;
    }

    private function canAccessAllEmpresas(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->belongsToMasterCompany();
    }

    private function belongsToMasterCompany(): bool
    {
        $masterCompanyName = $this->normalizeCompanyName(env('MASTER_COMPANY_NAME', 'NWB Asset'));

        if ($this->relationLoaded('empresa') && $this->empresa !== null) {
            return $this->normalizeCompanyName($this->empresa->nome_fantasia) === $masterCompanyName;
        }

        if ($this->empresa_id !== null) {
            $empresaNome = $this->relationLoaded('empresa')
                ? $this->empresa?->nome_fantasia
                : $this->empresa()->value('nome_fantasia');

            if ($this->normalizeCompanyName($empresaNome) === $masterCompanyName) {
                return true;
            }
        }

        if ($this->relationLoaded('empresas')) {
            return $this->empresas->contains(function (Empresa $empresa) use ($masterCompanyName): bool {
                return $this->normalizeCompanyName($empresa->nome_fantasia) === $masterCompanyName;
            });
        }

        return $this->empresas()
            ->whereRaw('LOWER(REGEXP_REPLACE(nome_fantasia, \'[^a-zA-Z0-9]+\', \'\', \'g\')) = ?', [$masterCompanyName])
            ->exists();
    }

    private function normalizeCompanyName(?string $value): string
    {
        $value = (string) ($value ?? '');
        $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
        $value = preg_replace('/[^a-zA-Z0-9]+/', '', $value) ?? '';

        return strtolower($value);
    }
}
