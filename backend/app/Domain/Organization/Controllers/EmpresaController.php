<?php

namespace App\Domain\Organization\Controllers;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Organization\Actions\CreateEmpresaAction;
use App\Domain\Organization\Actions\UpdateEmpresaAction;
use App\Domain\Organization\DTOs\EmpresaData;
use App\Domain\Organization\Models\Empresa;
use App\Domain\Organization\Queries\EmpresaIndexQuery;
use App\Domain\Organization\Requests\StoreEmpresaLogoRequest;
use App\Domain\Organization\Requests\StoreEmpresaRequest;
use App\Domain\Organization\Requests\UpdateEmpresaRequest;
use App\Domain\Organization\Resources\EmpresaResource;
use App\Domain\Organization\Services\EmpresaMatrizSyncService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmpresaController extends Controller
{
    public function index(Request $request, EmpresaIndexQuery $query)
    {
        $this->authorize('viewAny', Empresa::class);

        return EmpresaResource::collection(
            $query->handle($request->user())->paginate($request->integer('per_page', 15)),
        );
    }

    public function store(StoreEmpresaRequest $request, CreateEmpresaAction $action): EmpresaResource
    {
        $this->authorize('create', Empresa::class);

        return new EmpresaResource(
            $action->execute(EmpresaData::fromArray($request->validated()), $request->user()),
        );
    }

    public function show(Empresa $empresa, EmpresaMatrizSyncService $syncService): EmpresaResource
    {
        $this->authorize('view', $empresa);

        $syncService->sync($empresa);

        return new EmpresaResource($empresa->fresh()->loadCount('filiais')->load('filiais'));
    }

    public function update(UpdateEmpresaRequest $request, Empresa $empresa, UpdateEmpresaAction $action): EmpresaResource
    {
        $this->authorize('update', $empresa);

        return new EmpresaResource(
            $action->execute($empresa, EmpresaData::fromArray($request->validated()), $request->user()),
        );
    }

    public function destroy(Empresa $empresa, Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $this->authorize('delete', $empresa);

        $dadosAnteriores = $empresa->toArray();
        $empresa->delete();

        $auditLogger->log(
            usuario: $request->user(),
            evento: AuditoriaEventoEnum::EXCLUSAO->value,
            entidade: $empresa,
            empresaId: $empresa->id,
            dadosAnteriores: $dadosAnteriores,
            descricao: 'Empresa inativada.',
        );

        return response()->json(['message' => 'Empresa inativada com sucesso.']);
    }

    public function uploadLogo(StoreEmpresaLogoRequest $request, Empresa $empresa): JsonResponse
    {
        $this->authorize('update', $empresa);

        $arquivo = $request->file('logo');
        $extensao = strtolower($arquivo->getClientOriginalExtension() ?: 'png');
        $nomeArquivo = sprintf(
            '%d-%s.%s',
            $empresa->id,
            Str::uuid()->toString(),
            $extensao,
        );

        if ($empresa->logo_path) {
            Storage::disk('public')->delete($empresa->logo_path);
        }

        $caminho = $arquivo->storeAs('logos/empresas', $nomeArquivo, 'public');

        $empresa->forceFill([
            'logo_path' => $caminho,
        ])->save();

        return response()->json([
            'message' => 'Logo da empresa enviado com sucesso.',
            'data' => new EmpresaResource($empresa->fresh()->loadCount('filiais')),
        ]);
    }

    public function destroyLogo(Empresa $empresa): JsonResponse
    {
        $this->authorize('update', $empresa);

        if ($empresa->logo_path) {
            Storage::disk('public')->delete($empresa->logo_path);
        }

        $empresa->forceFill([
            'logo_path' => null,
        ])->save();

        return response()->json([
            'message' => 'Logo da empresa removido com sucesso.',
            'data' => new EmpresaResource($empresa->fresh()->loadCount('filiais')),
        ]);
    }
}
