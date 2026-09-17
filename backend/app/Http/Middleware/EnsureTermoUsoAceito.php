<?php

namespace App\Http\Middleware;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Auth\Services\TermoUsoService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloqueia a API para quem ainda nao aceitou a versao vigente do Termo de
 * Responsabilidade de Uso e LGPD. Aplicado a todo o grupo "api": so passam
 * as rotas necessarias para ler e aceitar o termo e para sair.
 */
class EnsureTermoUsoAceito
{
    private const ROTAS_LIVRES = [
        'api/v1/auth/login',
        'api/v1/auth/me',
        'api/v1/auth/logout',
        'api/v1/termo-uso',
        'api/v1/termo-uso/aceite',
        'api/v1/public/*',
        'api/health',
    ];

    public function __construct(private readonly TermoUsoService $termoUsoService)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is(...self::ROTAS_LIVRES)) {
            return $next($request);
        }

        $usuario = $request->user('sanctum');

        if ($usuario instanceof Usuario && $this->termoUsoService->pendente($usuario)) {
            return response()->json([
                'message' => 'E necessario aceitar o Termo de Responsabilidade de Uso e LGPD para continuar.',
                'codigo' => 'TERMO_USO_PENDENTE',
                'termo_versao' => $this->termoUsoService->versao(),
            ], 428);
        }

        return $next($request);
    }
}
