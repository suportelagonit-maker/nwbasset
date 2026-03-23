<?php

namespace App\Http\Middleware;

use App\Domain\MultiCompany\Services\EmpresaContextService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EmpresaContextMiddleware
{
    public function __construct(
        private readonly EmpresaContextService $empresaContextService,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $empresaId = $this->resolveEmpresaId($request);

        if ($empresaId === null || $empresaId <= 0) {
            return response()->json([
                'message' => 'empresa_id ou o cabecalho X-Empresa-Id sao obrigatorios para esta operacao.',
            ], 422);
        }

        $usuario = $request->user();

        if ($usuario && ! $usuario->pertenceAEmpresa($empresaId)) {
            return response()->json([
                'message' => 'Usuario sem acesso a empresa informada.',
            ], 403);
        }

        if ($request->has('empresa_id') && (int) $request->input('empresa_id') !== $empresaId) {
            return response()->json([
                'message' => 'empresa_id informado diverge do contexto ativo.',
            ], 422);
        }

        $request->attributes->set('empresa_id', $empresaId);
        $request->merge(['empresa_id' => $empresaId]);
        $this->empresaContextService->setEmpresaContext($empresaId);

        return $next($request);
    }

    private function resolveEmpresaId(Request $request): ?int
    {
        $headerEmpresaId = (int) $request->header('X-Empresa-Id');

        if ($headerEmpresaId > 0) {
            return $headerEmpresaId;
        }

        $inputEmpresaId = (int) $request->input('empresa_id');

        if ($inputEmpresaId > 0) {
            return $inputEmpresaId;
        }

        $usuario = $request->user();

        if (! $usuario) {
            return null;
        }

        $empresaIds = $usuario->empresasAcessiveis()->pluck('id');

        if ($empresaIds->count() === 1) {
            return (int) $empresaIds->first();
        }

        return null;
    }
}
