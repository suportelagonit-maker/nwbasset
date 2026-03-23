<?php

namespace App\Domain\MultiCompany\Controllers;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Auth\Resources\UsuarioResource;
use App\Domain\MultiCompany\Actions\SyncUsuarioEmpresasAction;
use App\Domain\MultiCompany\DTOs\UsuarioEmpresasData;
use App\Domain\MultiCompany\Requests\SyncUsuarioEmpresasRequest;
use App\Http\Controllers\Controller;

class UsuarioEmpresaController extends Controller
{
    public function sync(SyncUsuarioEmpresasRequest $request, Usuario $usuario, SyncUsuarioEmpresasAction $action): UsuarioResource
    {
        $this->authorize('update', $usuario);

        return new UsuarioResource(
            $action->execute(
                $usuario,
                UsuarioEmpresasData::fromArray($request->validated()),
                $request->user(),
            ),
        );
    }
}
