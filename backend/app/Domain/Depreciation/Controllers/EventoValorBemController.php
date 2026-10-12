<?php

namespace App\Domain\Depreciation\Controllers;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Enums\TipoEventoValorEnum;
use App\Domain\Depreciation\Models\EventoValorBem;
use App\Domain\Depreciation\Services\EventoValorBemService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Eventos de valor de um bem: acrescimo, reavaliacao, impairment, baixa parcial. */
class EventoValorBemController extends Controller
{
    public function __construct(private readonly EventoValorBemService $service)
    {
    }

    public function index(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $this->garantirEmpresa($request, $bem);

        $eventos = EventoValorBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->orderBy('competencia')
            ->orderBy('id')
            ->get()
            ->map(fn (EventoValorBem $e): array => [
                'id' => $e->id,
                'tipo' => $e->tipo,
                'rotulo' => TipoEventoValorEnum::from($e->tipo)->rotulo(),
                'competencia' => $e->competencia?->toDateString(),
                'mes' => $e->competencia?->format('m/Y'),
                'valor' => (float) $e->valor,
                'nova_vida_util_meses' => $e->nova_vida_util_meses,
                'descricao' => $e->descricao,
            ]);

        return response()->json(['data' => $eventos]);
    }

    public function store(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $this->garantirEmpresa($request, $bem);

        $dados = $request->validate([
            'tipo' => ['required', Rule::in(TipoEventoValorEnum::values())],
            'competencia' => ['required', 'date'],
            'valor' => ['required', 'numeric', 'min:0.01'],
            'nova_vida_util_meses' => ['nullable', 'integer', 'min:1', 'max:1200'],
            'descricao' => ['nullable', 'string', 'max:500'],
        ], [], [
            'competencia' => 'competência',
            'valor' => 'valor',
        ]);

        $evento = $this->service->registrar($bem, $dados, $request->user());

        return response()->json([
            'message' => 'Evento de valor registrado. A depreciação recalcula a partir dele.',
            'data' => ['id' => $evento->id],
        ], 201);
    }

    public function destroy(Request $request, BemPatrimonial $bem, EventoValorBem $evento): JsonResponse
    {
        $this->garantirEmpresa($request, $bem);
        abort_if((int) $evento->bem_patrimonial_id !== (int) $bem->id, 404);

        $this->service->remover($evento);

        return response()->json(['message' => 'Evento removido. A depreciação volta ao cálculo sem ele.']);
    }

    private function garantirEmpresa(Request $request, BemPatrimonial $bem): void
    {
        $empresaId = (int) $request->attributes->get('empresa_id');
        abort_if($empresaId > 0 && (int) $bem->empresa_id !== $empresaId, 404);
    }
}
