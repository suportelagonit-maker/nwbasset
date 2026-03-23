<?php

namespace App\Domain\Organization\Controllers;

use App\Domain\Organization\Models\Local;
use App\Domain\Organization\Requests\StoreLocalRequest;
use App\Domain\Organization\Requests\UpdateLocalRequest;
use App\Domain\Organization\Resources\LocalResource;
use App\Domain\Shared\Services\CodigoCadastroService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LocalController extends Controller
{
    public function index(Request $request)
    {
        $query = Local::query()->orderBy('nome');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->integer('empresa_id'));
        }

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('unidade_administrativa_id')) {
            $query->where('unidade_administrativa_id', $request->integer('unidade_administrativa_id'));
        }

        if ($request->filled('departamento_id')) {
            $query->where('departamento_id', $request->integer('departamento_id'));
        }

        return LocalResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreLocalRequest $request, CodigoCadastroService $codigoCadastroService): LocalResource
    {
        $local = Local::query()->create([
            ...$request->validated(),
            'codigo' => 'TMP-'.Str::upper(Str::random(10)),
            'status' => $request->validated()['status'] ?? 'ativo',
        ]);

        $codigoCadastroService->aplicar($local, 'LOC');

        return new LocalResource($local->fresh());
    }

    public function show(Local $local): LocalResource
    {
        return new LocalResource($local);
    }

    public function update(UpdateLocalRequest $request, Local $local): LocalResource
    {
        $local->update(array_diff_key($request->validated(), ['codigo' => true]));

        return new LocalResource($local->fresh());
    }

    public function destroy(Local $local): JsonResponse
    {
        $local->delete();

        return response()->json(['message' => 'Local removido com sucesso.']);
    }
}
