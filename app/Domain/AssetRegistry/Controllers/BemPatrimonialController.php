<?php

namespace App\Domain\AssetRegistry\Controllers;

use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Requests\StoreBemPatrimonialRequest;
use App\Domain\AssetRegistry\Requests\UpdateBemPatrimonialRequest;
use App\Domain\AssetRegistry\Resources\BemPatrimonialResource;
use App\Domain\Depreciation\Services\DepreciacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BemPatrimonialController extends Controller
{
    public function __construct(
        private readonly LogOperacaoPatrimonialService $logOperacaoPatrimonialService,
        private readonly DepreciacaoService $depreciacaoService,
    ) {
    }

    public function index(Request $request)
    {
        $query = BemPatrimonial::query()
            ->with(['imagens', 'documentos'])
            ->orderBy('numero_tombo');
        $this->empresaContext()->aplicarFiltroEmpresa($query);

        if ($request->filled('filial_id')) {
            $query->where('filial_id', $request->integer('filial_id'));
        }

        if ($request->filled('local_id')) {
            $query->where('local_id', $request->integer('local_id'));
        }

        return BemPatrimonialResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreBemPatrimonialRequest $request): BemPatrimonialResource
    {
        $dados = $request->validated();
        $regraDepreciacao = $this->depreciacaoService->obterRegraPadraoPorTipoBem(
            (int) $dados['empresa_id'],
            $dados['categoria'] ?? null,
        );
        $valorAquisicao = (float) ($dados['valor_aquisicao'] ?? 0);
        $valorResidualInformado = array_key_exists('valor_residual', $dados) && $dados['valor_residual'] !== null;
        $valorResidualPadrao = $regraDepreciacao
            ? round($valorAquisicao * ((float) $regraDepreciacao->valor_residual_percentual / 100), 2)
            : 0;
        $vidaUtilInformada = array_key_exists('vida_util_anos', $dados) && (int) $dados['vida_util_anos'] > 0
            ? (int) $dados['vida_util_anos']
            : null;

        $bem = BemPatrimonial::query()->create([
            ...$dados,
            'valor_aquisicao' => $valorAquisicao,
            'valor_residual' => $valorResidualInformado ? (float) $dados['valor_residual'] : $valorResidualPadrao,
            'vida_util_anos' => $vidaUtilInformada ?? $regraDepreciacao?->vida_util_anos,
            'status_bem' => $dados['status_bem'] ?? 'ativo',
            'estado_conservacao' => $dados['estado_conservacao'] ?? 'bom',
        ]);

        $usuarioId = $request->user()?->id ? (int) $request->user()->id : null;
        $this->depreciacaoService->herdarRegraDepreciacaoParaBem($bem, $usuarioId);

        $this->logOperacaoPatrimonialService->registrar(
            'CADASTRO_BEM',
            $bem,
            $bem->empresa_id,
            [],
            $bem->toArray(),
        );

        return new BemPatrimonialResource($bem->load(['imagens', 'documentos']));
    }

    public function show(BemPatrimonial $bem): BemPatrimonialResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);

        return new BemPatrimonialResource($bem->load(['imagens', 'documentos']));
    }

    public function update(UpdateBemPatrimonialRequest $request, BemPatrimonial $bem): BemPatrimonialResource
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);
        $bem->update($request->validated());

        return new BemPatrimonialResource($bem->fresh()->load(['imagens', 'documentos']));
    }

    public function destroy(BemPatrimonial $bem): JsonResponse
    {
        $this->empresaContext()->garantirModelDaEmpresa($bem);
        $bem->delete();

        return response()->json(['message' => 'Bem patrimonial removido com sucesso.']);
    }
}
