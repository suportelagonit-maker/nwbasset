<?php

namespace App\Domain\Organization\Controllers;

use App\Domain\Organization\Models\Departamento;
use App\Domain\Organization\Requests\StoreDepartamentoRequest;
use App\Domain\Organization\Requests\UpdateDepartamentoRequest;
use App\Domain\Organization\Resources\DepartamentoResource;
use App\Domain\Shared\Services\CodigoCadastroService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DepartamentoController extends Controller
{
    public function index(Request $request)
    {
        $query = Departamento::query()->orderBy('nome');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->integer('empresa_id'));
        }

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('unidade_administrativa_id')) {
            $query->where('unidade_administrativa_id', $request->integer('unidade_administrativa_id'));
        }

        return DepartamentoResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreDepartamentoRequest $request, CodigoCadastroService $codigoCadastroService): DepartamentoResource
    {
        $departamento = Departamento::query()->create([
            ...$request->validated(),
            'codigo' => 'TMP-'.Str::upper(Str::random(10)),
            'status' => $request->validated()['status'] ?? 'ativo',
        ]);

        $codigoCadastroService->aplicar($departamento, 'DEP');

        return new DepartamentoResource($departamento->fresh());
    }

    public function show(Departamento $departamento): DepartamentoResource
    {
        return new DepartamentoResource($departamento);
    }

    public function update(UpdateDepartamentoRequest $request, Departamento $departamento): DepartamentoResource
    {
        $departamento->update(array_diff_key($request->validated(), ['codigo' => true]));

        return new DepartamentoResource($departamento->fresh());
    }

    public function destroy(Departamento $departamento): JsonResponse
    {
        $departamento->delete();

        return response()->json(['message' => 'Departamento removido com sucesso.']);
    }
}
