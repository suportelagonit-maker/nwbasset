<?php

namespace App\Domain\Auth\Queries;

use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Builder;

class UsuarioIndexQuery
{
    public function handle(int $empresaId): Builder
    {
        return Usuario::query()
            ->whereHas('empresas', fn (Builder $builder) => $builder->where('empresas.id', $empresaId))
            ->with([
                'empresa',
                'empresas' => fn ($relation) => $relation->where('empresas.id', $empresaId),
                'permissoesDiretas' => fn ($relation) => $relation->where('empresa_id', $empresaId),
            ])
            ->orderBy('nome');
    }
}
