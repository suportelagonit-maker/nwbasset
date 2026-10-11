<?php

namespace App\Domain\Inventory\Controllers;

use App\Domain\Inventory\Enums\ResultadoLeituraEnum;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Inventory\Models\InventarioItem;
use App\Domain\Inventory\Models\InventarioLeitura;
use App\Domain\Inventory\Services\ContagemInventarioService;
use App\Domain\Inventory\Services\InventarioService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** A contagem de inventário como ela acontece em campo. */
class ContagemInventarioController extends Controller
{
    public function __construct(
        private readonly ContagemInventarioService $contagemService,
        private readonly InventarioService $inventarioService,
    ) {
    }

    /** Estado da contagem: progresso, pendentes e leituras recentes. */
    public function show(Request $request, Inventario $inventario): JsonResponse
    {
        $this->garantirEmpresa($request, $inventario);

        // Paginado: inventario grande tem milhares de pendentes, e o
        // aparelho em campo nao aguenta receber tudo de uma vez.
        $porPagina = min(200, max(20, (int) $request->integer('por_pagina', 50)));
        $paginaDePendentes = InventarioItem::query()
            ->where('inventario_id', $inventario->id)
            ->where('localizado', false)
            ->with(['bemPatrimonial:id,numero_tombo,descricao,local_id', 'bemPatrimonial.local:id,nome'])
            ->orderBy('id')
            ->paginate($porPagina, ['*'], 'pagina');

        $pendentes = $paginaDePendentes
            ->getCollection()
            ->map(fn (InventarioItem $item): array => [
                'id' => $item->id,
                'bem_patrimonial_id' => $item->bem_patrimonial_id,
                'numero_tombo' => $item->bemPatrimonial?->numero_tombo,
                'descricao' => $item->bemPatrimonial?->descricao,
                'local' => $item->bemPatrimonial?->local?->nome,
            ]);

        $atencao = InventarioLeitura::query()
            ->where('inventario_id', $inventario->id)
            ->where('resultado', '!=', ResultadoLeituraEnum::CONTADO->value)
            ->with('bemPatrimonial:id,numero_tombo,descricao')
            ->orderByDesc('lido_em')
            ->limit(50)
            ->get()
            ->map(fn (InventarioLeitura $leitura): array => [
                'id' => $leitura->id,
                'codigo' => $leitura->codigo_lido,
                'resultado' => $leitura->resultado,
                'mensagem' => ResultadoLeituraEnum::from($leitura->resultado)->mensagem(),
                'lido_em' => $leitura->lido_em?->toIso8601String(),
                'bem' => $leitura->bemPatrimonial ? [
                    'numero_tombo' => $leitura->bemPatrimonial->numero_tombo,
                    'descricao' => $leitura->bemPatrimonial->descricao,
                ] : null,
            ]);

        return response()->json([
            'data' => [
                'inventario' => [
                    'id' => $inventario->id,
                    'nome' => $inventario->nome,
                    'status' => $inventario->status,
                    'tipo' => $inventario->tipo,
                    'filial_id' => $inventario->filial_id,
                    'locais' => $inventario->locais()->pluck('locais.nome')->all(),
                ],
                'resumo' => $this->contagemService->resumo($inventario),
                'pendentes' => $pendentes,
                'paginacao' => [
                    'pagina' => $paginaDePendentes->currentPage(),
                    'por_pagina' => $paginaDePendentes->perPage(),
                    'total' => $paginaDePendentes->total(),
                    'ultima_pagina' => $paginaDePendentes->lastPage(),
                ],
                'atencao' => $atencao,
            ],
        ]);
    }

    /** Recebe uma leitura ou a fila inteira que ficou presa sem rede. */
    public function registrarLeituras(Request $request, Inventario $inventario): JsonResponse
    {
        $this->garantirEmpresa($request, $inventario);

        $dados = $request->validate([
            'leituras' => ['required', 'array', 'min:1', 'max:200'],
            'leituras.*.codigo' => ['required', 'string', 'max:255'],
            'leituras.*.origem_id' => ['nullable', 'string', 'max:64'],
            'leituras.*.local_id' => ['nullable', 'integer', 'exists:locais,id'],
            'leituras.*.responsavel_id' => ['nullable', 'integer', 'exists:responsaveis,id'],
            'leituras.*.lido_em' => ['nullable', 'date'],
            'leituras.*.observacoes' => ['nullable', 'string', 'max:500'],
        ], [], [
            'leituras.*.codigo' => 'código lido',
        ]);

        return response()->json([
            'data' => $this->contagemService->registrarLeituras(
                $inventario,
                $dados['leituras'],
                $request->user(),
            ),
        ]);
    }

    /** Fecha a contagem e gera a conciliação com as divergências. */
    public function finalizar(Request $request, Inventario $inventario): JsonResponse
    {
        $this->garantirEmpresa($request, $inventario);

        $dados = $request->validate([
            'data_conciliacao' => ['nullable', 'date'],
        ]);

        $conciliacao = $this->inventarioService->registrarConciliacao([
            'inventario_id' => $inventario->id,
            'data_conciliacao' => $dados['data_conciliacao'] ?? now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Inventário conciliado.',
            'data' => $conciliacao,
        ]);
    }

    private function garantirEmpresa(Request $request, Inventario $inventario): void
    {
        $empresaId = (int) $request->attributes->get('empresa_id');

        abort_if($empresaId > 0 && (int) $inventario->empresa_id !== $empresaId, 404);
    }
}
