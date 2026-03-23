<?php

namespace App\Domain\Organization\Queries;

use App\Domain\Organization\Models\Filial;
use Illuminate\Database\Eloquent\Builder;

class FilialIndexQuery
{
    public function handle(int $empresaId): Builder
    {
        return Filial::query()
            ->where('empresa_id', $empresaId)
            ->orderByDesc('matriz')
            ->orderBy('nome');
    }
}
