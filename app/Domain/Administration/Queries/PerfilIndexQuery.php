<?php

namespace App\Domain\Administration\Queries;

use App\Domain\Administration\Models\Perfil;
use Illuminate\Database\Eloquent\Builder;

class PerfilIndexQuery
{
    public function handle(int $empresaId): Builder
    {
        return Perfil::query()
            ->where('empresa_id', $empresaId)
            ->with('permissoes')
            ->orderBy('nome');
    }
}
