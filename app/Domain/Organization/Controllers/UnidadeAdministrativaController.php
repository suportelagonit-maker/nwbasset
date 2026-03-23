<?php

namespace App\Domain\Organization\Controllers;

use App\Domain\Organization\Models\UnidadeAdministrativa;
use App\Domain\Organization\Requests\StoreUnidadeAdministrativaRequest;
use App\Domain\Organization\Requests\UpdateUnidadeAdministrativaRequest;
use App\Domain\Organization\Resources\UnidadeAdministrativaResource;
use App\Domain\Shared\Services\CodigoCadastroService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UnidadeAdministrativaController extends Controller
{
    public function index(Request $request)
    {
        $query = UnidadeAdministrativa::query()->orderBy('nome');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->integer('empresa_id'));
        }

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        return UnidadeAdministrativaResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreUnidadeAdministrativaRequest $request, CodigoCadastroService $codigoCadastroService): UnidadeAdministrativaResource
    {
        $unidade = UnidadeAdministrativa::query()->create([
            ...$request->validated(),
            'codigo' => 'TMP-'.Str::upper(Str::random(10)),
            'status' => $request->validated()['status'] ?? 'ativo',
        ]);

        $codigoCadastroService->aplicar($unidade, 'UAD');

        return new UnidadeAdministrativaResource($unidade->fresh());
    }

    public function show(UnidadeAdministrativa $unidadeAdministrativa): UnidadeAdministrativaResource
    {
        return new UnidadeAdministrativaResource($unidadeAdministrativa);
    }

    public function update(UpdateUnidadeAdministrativaRequest $request, UnidadeAdministrativa $unidadeAdministrativa): UnidadeAdministrativaResource
    {
        $unidadeAdministrativa->update(array_diff_key($request->validated(), ['codigo' => true]));

        return new UnidadeAdministrativaResource($unidadeAdministrativa->fresh());
    }

    public function destroy(UnidadeAdministrativa $unidadeAdministrativa): JsonResponse
    {
        $unidadeAdministrativa->delete();

        return response()->json(['message' => 'Unidade administrativa removida com sucesso.']);
    }
}
