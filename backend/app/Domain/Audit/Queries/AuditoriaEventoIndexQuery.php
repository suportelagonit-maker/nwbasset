<?php

namespace App\Domain\Audit\Queries;

use App\Domain\Audit\Models\AuditoriaEvento;
use Illuminate\Database\Eloquent\Builder;

class AuditoriaEventoIndexQuery
{
    public function handle(int $empresaId): Builder
    {
        return AuditoriaEvento::query()
            ->where('empresa_id', $empresaId)
            ->with('usuario')
            ->latest();
    }
}
