<?php

namespace App\Domain\Auth\Controllers;

use App\Domain\Auth\Services\TermoUsoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TermoUsoController extends Controller
{
    public function __construct(private readonly TermoUsoService $termoUsoService)
    {
    }

    /** Texto vigente do termo e a situacao do aceite do usuario autenticado. */
    public function show(Request $request): JsonResponse
    {
        $conteudo = $this->termoUsoService->conteudo();
        $aceite = $this->termoUsoService->aceiteAtual($request->user());

        return response()->json([
            'data' => [
                ...$conteudo,
                'aceite' => $this->termoUsoService->resumoAceite($aceite),
                'pendente' => $aceite === null,
            ],
        ]);
    }

    /** Registra o aceite da versao vigente pelo usuario autenticado. */
    public function aceitar(Request $request): JsonResponse
    {
        $request->validate([
            'aceito' => ['required', 'accepted'],
            'versao' => ['required', 'string', 'in:'.$this->termoUsoService->versao()],
        ]);

        $aceite = $this->termoUsoService->registrarAceite($request->user(), $request);

        return response()->json([
            'message' => 'Termo aceito com sucesso.',
            'data' => $this->termoUsoService->resumoAceite($aceite),
        ]);
    }
}
