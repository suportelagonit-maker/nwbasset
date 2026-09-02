<?php

namespace App\Domain\Organization\Controllers;

use App\Domain\Organization\Models\Responsavel;
use App\Domain\Organization\Requests\StoreResponsavelRequest;
use App\Domain\Organization\Requests\UpdateResponsavelRequest;
use App\Domain\Organization\Resources\ResponsavelResource;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ResponsavelController extends Controller
{
    public function index(Request $request)
    {
        $query = Responsavel::query()->orderBy('nome');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->integer('empresa_id'));
        }

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('departamento_id')) {
            $query->where('departamento_id', $request->integer('departamento_id'));
        }

        return ResponsavelResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreResponsavelRequest $request): ResponsavelResource
    {
        $payload = $request->validated();

        if (empty($payload['matricula'])) {
            $payload['matricula'] = $this->gerarMatriculaAutomatica((int) $payload['empresa_id']);
        }

        $responsavel = Responsavel::query()->create([
            ...$payload,
            'status' => $payload['status'] ?? 'ativo',
        ]);

        return new ResponsavelResource($responsavel);
    }

    public function show(Responsavel $responsavel): ResponsavelResource
    {
        return new ResponsavelResource($responsavel);
    }

    public function update(UpdateResponsavelRequest $request, Responsavel $responsavel): ResponsavelResource
    {
        $responsavel->update($request->validated());

        return new ResponsavelResource($responsavel->fresh());
    }

    private function gerarMatriculaAutomatica(int $empresaId): string
    {
        $sequencia = (int) Responsavel::query()
            ->where('empresa_id', $empresaId)
            ->count();

        do {
            $sequencia++;
            $matricula = 'RESP-' . Str::padLeft((string) $sequencia, 6, '0');
            $existe = Responsavel::query()
                ->where('empresa_id', $empresaId)
                ->where('matricula', $matricula)
                ->exists();
        } while ($existe);

        return $matricula;
    }

    public function destroy(Responsavel $responsavel): JsonResponse
    {
        $responsavel->delete();

        return response()->json(['message' => 'Responsável removido com sucesso.']);
    }
}
