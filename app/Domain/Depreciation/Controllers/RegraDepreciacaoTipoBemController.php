<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Requests\StoreRegraDepreciacaoTipoBemRequest;
use App\Domain\Depreciation\Requests\UpdateRegraDepreciacaoTipoBemRequest;
use App\Domain\Depreciation\Resources\RegraDepreciacaoTipoBemResource;
use App\Domain\Depreciation\Services\DepreciacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class RegraDepreciacaoTipoBemController extends Controller
{
    public function __construct(private readonly DepreciacaoService $depreciacaoService)
    {
    }

    public function index(Request $request)
    {
        if (! Schema::hasTable('regras_depreciacao_tipos_bens')) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->integer('per_page', 15),
                    'total' => 0,
                ],
            ]);
        }

        $empresaIdContexto = (int) $request->attributes->get('empresa_id');

        if ($empresaIdContexto > 0) {
            $this->depreciacaoService->sincronizarRegrasPadraoPorEmpresa($empresaIdContexto);
        }

        $query = RegraDepreciacaoTipoBem::query()
            ->with(array_filter([
                'metodoDepreciacao',
                Schema::hasTable('tipos_bens_patrimoniais') ? 'tipoBemPatrimonial' : null,
            ]))
            ->orderBy('tipo_bem');
        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'base_regra')) {
            $query->orderBy('base_regra');
        }
        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'data_inicio_vigencia')) {
            $query->orderByDesc('data_inicio_vigencia');
        }
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->integer('empresa_id'));
        }

        if ($request->filled('tipo_bem')) {
            $query->where('tipo_bem', $request->string('tipo_bem')->toString());
        }

        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'tipo_bem_id') && $request->filled('tipo_bem_id')) {
            $query->where('tipo_bem_id', $request->integer('tipo_bem_id'));
        }

        if ($request->filled('metodo_depreciacao_id')) {
            $query->where('metodo_depreciacao_id', $request->integer('metodo_depreciacao_id'));
        }

        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'base_regra') && $request->filled('base_regra')) {
            $query->where('base_regra', $request->string('base_regra')->toString());
        }

        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'ativo') && $request->filled('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        return RegraDepreciacaoTipoBemResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreRegraDepreciacaoTipoBemRequest $request): RegraDepreciacaoTipoBemResource
    {
        $regra = RegraDepreciacaoTipoBem::query()->create($request->payload());
        $this->depreciacaoService->aplicarDepreciacaoAutomaticaPorEmpresa((int) $regra->empresa_id);

        return new RegraDepreciacaoTipoBemResource($regra->load(array_filter([
            'metodoDepreciacao',
            Schema::hasTable('tipos_bens_patrimoniais') ? 'tipoBemPatrimonial' : null,
        ])));
    }

    public function show(RegraDepreciacaoTipoBem $regraDepreciacao): RegraDepreciacaoTipoBemResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($regraDepreciacao);

        return new RegraDepreciacaoTipoBemResource($regraDepreciacao->load(array_filter([
            'metodoDepreciacao',
            Schema::hasTable('tipos_bens_patrimoniais') ? 'tipoBemPatrimonial' : null,
        ])));
    }

    public function update(
        UpdateRegraDepreciacaoTipoBemRequest $request,
        RegraDepreciacaoTipoBem $regraDepreciacao
    ): RegraDepreciacaoTipoBemResource {
        $this->empresaContext()->garantirModelDaEmpresa($regraDepreciacao);
        $regraDepreciacao->update($request->payload());
        $this->depreciacaoService->aplicarDepreciacaoAutomaticaPorEmpresa((int) $regraDepreciacao->empresa_id);

        return new RegraDepreciacaoTipoBemResource($regraDepreciacao->fresh()->load(array_filter([
            'metodoDepreciacao',
            Schema::hasTable('tipos_bens_patrimoniais') ? 'tipoBemPatrimonial' : null,
        ])));
    }

    public function destroy(RegraDepreciacaoTipoBem $regraDepreciacao): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($regraDepreciacao);
        $empresaId = (int) $regraDepreciacao->empresa_id;
        $regraDepreciacao->delete();
        $this->depreciacaoService->aplicarDepreciacaoAutomaticaPorEmpresa($empresaId);

        return response()->json(['message' => 'Regra de depreciacao removida com sucesso.']);
    }
}
