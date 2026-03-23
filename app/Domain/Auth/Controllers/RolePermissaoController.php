<?php

namespace App\Domain\Auth\Controllers;

use App\Domain\Auth\Models\RolePermissao;
use App\Domain\Auth\Resources\RolePermissaoResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RolePermissaoController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return RolePermissaoResource::collection(
            RolePermissao::query()
                ->orderBy('role')
                ->orderBy('permissao')
                ->get(),
        );
    }
}
