<?php

namespace App\Domain\Administration\Queries;

use App\Domain\Administration\Models\Permissao;
use Illuminate\Database\Eloquent\Builder;

class PermissaoIndexQuery
{
    public function handle(int $empresaId): Builder
    {
        return Permissao::query()
            ->where('empresa_id', $empresaId)
            ->orderBy('grupo')
            ->orderBy('nome');
    }
}
