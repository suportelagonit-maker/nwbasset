<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Em produção o container só é alcançado pelo proxy reverso (Apache do
        // cPanel, publicado em 127.0.0.1). Confiar nele é o que permite ao
        // Laravel enxergar o IP real do cliente (rate limit, auditoria) e o
        // esquema https (URLs geradas, cookies seguros).
        $middleware->trustProxies(at: '*');

        $middleware->statefulApi();
        $middleware->redirectGuestsTo(function (Request $request): ?string {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }

            return env('FRONTEND_LOGIN_URL', 'http://localhost:5001/login');
        });

        $middleware->alias([
            'empresa.context' => \App\Http\Middleware\EmpresaContextMiddleware::class,
            'empresa.context.legacy' => \App\Http\Middleware\EnsureEmpresaContext::class,
            'role.permission' => \App\Http\Middleware\RolePermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $e, $request) {
            return response()->json([
                'message' => 'Não autenticado.',
            ], 401);
        });
    })->create();
