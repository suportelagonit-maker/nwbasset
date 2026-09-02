<?php

namespace App\Domain\Organization\Queries;

use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Builder;

class EmpresaIndexQuery
{
    public function handle(Usuario $usuario): Builder
    {
        return $usuario->empresasAcessiveisQuery()->withCount('filiais');
    }
}
