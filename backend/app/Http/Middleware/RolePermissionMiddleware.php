<?php

namespace App\Http\Middleware;

use App\Domain\Auth\Services\AuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RolePermissionMiddleware
{
    public function __construct(
        private readonly AuthService $authService,
    ) {
    }

    public function handle(Request $request, Closure $next, string $module, ?string $action = null): Response
    {
        $usuario = $request->user();

        if (! $usuario) {
            return response()->json([
                'message' => 'Nao autenticado.',
            ], 401);
        }

        $permissao = sprintf('%s.%s', $module, $action ?? $this->resolveAction($request));

        if (! $this->authService->validarPermissao($usuario, $permissao, $request->attributes->get('empresa_id'))) {
            return response()->json([
                'message' => 'Usuario sem permissao para esta operacao.',
                'permissao' => $permissao,
            ], 403);
        }

        return $next($request);
    }

    private function resolveAction(Request $request): string
    {
        return match ($request->method()) {
            'GET', 'HEAD' => 'visualizar',
            'POST' => 'criar',
            'PUT', 'PATCH' => 'atualizar',
            'DELETE' => 'excluir',
            default => 'visualizar',
        };
    }
}
