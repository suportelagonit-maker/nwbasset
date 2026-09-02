<?php

namespace App\Domain\Audit\Controllers;

use App\Domain\Audit\Models\AuditoriaEvento;
use App\Domain\Audit\Queries\AuditoriaEventoIndexQuery;
use App\Domain\Audit\Resources\AuditoriaEventoResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AuditoriaEventoController extends Controller
{
    public function index(Request $request, AuditoriaEventoIndexQuery $query)
    {
        $this->authorize('viewAny', AuditoriaEvento::class);

        return AuditoriaEventoResource::collection(
            $query->handle((int) $request->attributes->get('empresa_id'))->paginate($request->integer('per_page', 20)),
        );
    }

    public function show(AuditoriaEvento $auditoriaEvento): AuditoriaEventoResource
    {
        $this->authorize('view', $auditoriaEvento);

        return new AuditoriaEventoResource($auditoriaEvento->load('usuario'));
    }
}
