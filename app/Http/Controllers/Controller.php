<?php

namespace App\Http\Controllers;

use App\Domain\MultiCompany\Services\EmpresaContextService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

abstract class Controller
{
    use AuthorizesRequests;
    use ValidatesRequests;

    protected function empresaContext(): EmpresaContextService
    {
        return app(EmpresaContextService::class);
    }
}
