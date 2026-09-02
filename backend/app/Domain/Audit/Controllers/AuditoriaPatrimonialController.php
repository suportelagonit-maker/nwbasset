<?php

namespace App\Domain\Audit\Controllers;

use App\Domain\Audit\Models\AuditoriaPatrimonial;
use App\Domain\Audit\Requests\StoreAuditoriaPatrimonialRequest;
use App\Domain\Audit\Requests\UpdateAuditoriaPatrimonialRequest;
use App\Domain\Audit\Resources\AuditoriaPatrimonialResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditoriaPatrimonialController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditoriaPatrimonial::query()->orderByDesc('data_auditoria')->orderByDesc('id');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('inventario_id')) {
            $query->where('inventario_id', $request->integer('inventario_id'));
        }

        return AuditoriaPatrimonialResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreAuditoriaPatrimonialRequest $request): AuditoriaPatrimonialResource
    {
        $auditoria = AuditoriaPatrimonial::query()->create($request->validated());

        return new AuditoriaPatrimonialResource($auditoria);
    }

    public function show(AuditoriaPatrimonial $auditoria): AuditoriaPatrimonialResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($auditoria);

        return new AuditoriaPatrimonialResource($auditoria);
    }

    public function update(
        UpdateAuditoriaPatrimonialRequest $request,
        AuditoriaPatrimonial $auditoria
    ): AuditoriaPatrimonialResource {
        $this->empresaContext()->garantirModelDaEmpresa($auditoria);
        $auditoria->update($request->validated());

        return new AuditoriaPatrimonialResource($auditoria->fresh());
    }

    public function destroy(AuditoriaPatrimonial $auditoria): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($auditoria);
        $auditoria->delete();

        return response()->json(['message' => 'Auditoria patrimonial removida com sucesso.']);
    }
}
