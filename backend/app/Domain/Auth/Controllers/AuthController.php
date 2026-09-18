<?php

namespace App\Domain\Auth\Controllers;

use App\Domain\Auth\DTOs\LoginData;
use App\Domain\Auth\Requests\LoginRequest;
use App\Domain\Auth\Resources\UsuarioResource;
use App\Domain\Auth\Services\AuthService;
use App\Domain\Auth\Services\CaptchaValidationService;
use App\Domain\Auth\Services\NwbIdService;
use App\Domain\Auth\Services\TermoUsoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function login(
        LoginRequest $request,
        AuthService $authService,
        CaptchaValidationService $captchaValidationService,
        TermoUsoService $termoUsoService,
    ): JsonResponse
    {
        $captchaValidationService->validateOrFail(
            $request->input('captcha_token'),
            $request->ip(),
        );

        $result = $authService->login(LoginData::fromArray($request->validated()));

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $result['token'],
            'empresa_atual' => $result['empresa_atual']
                ? [
                    'id' => $result['empresa_atual']->id,
                    'nome_fantasia' => $result['empresa_atual']->nome_fantasia,
                    'cnpj' => $result['empresa_atual']->cnpj,
                    'logo_url' => $result['empresa_atual']->logo_url,
                ]
                : null,
            'permissoes' => $result['permissoes'],
            'usuario' => new UsuarioResource($result['usuario']),
            'termo_pendente' => $termoUsoService->pendente($result['usuario']),
            'termo_versao' => $termoUsoService->versao(),
        ]);
    }

    /** Configuracao publica do NWB ID para a tela de login (sem segredos). */
    public function nwbidConfig(NwbIdService $nwbIdService): JsonResponse
    {
        return response()->json(['data' => $nwbIdService->configPublica()]);
    }

    /** Troca o access token do NWB ID por uma sessao local. */
    public function loginNwbId(Request $request, AuthService $authService, TermoUsoService $termoUsoService): JsonResponse
    {
        $dados = $request->validate([
            'access_token' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:80'],
        ]);

        $result = $authService->loginComNwbId($dados['access_token'], $dados['device_name'] ?? 'nwbasset-nwbid');

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $result['token'],
            'empresa_atual' => $result['empresa_atual']
                ? [
                    'id' => $result['empresa_atual']->id,
                    'nome_fantasia' => $result['empresa_atual']->nome_fantasia,
                    'cnpj' => $result['empresa_atual']->cnpj,
                    'logo_url' => $result['empresa_atual']->logo_url,
                ]
                : null,
            'permissoes' => $result['permissoes'],
            'usuario' => new UsuarioResource($result['usuario']),
            'termo_pendente' => $termoUsoService->pendente($result['usuario']),
            'termo_versao' => $termoUsoService->versao(),
        ]);
    }

    public function me(Request $request, AuthService $authService, TermoUsoService $termoUsoService): JsonResponse
    {
        $usuario = $request->user()->load(['empresas']);
        $empresaId = (int) ($request->header('X-Empresa-Id') ?: $request->query('empresa_id') ?: $usuario->empresaPadrao()?->id);

        if ($empresaId > 0) {
            $request->attributes->set('empresa_id', $empresaId);
        }

        $empresaAtual = $empresaId > 0
            ? $usuario->empresasAcessiveis()->firstWhere('id', $empresaId)
            : $usuario->empresaPadrao();

        if ($empresaAtual) {
            $usuario->setRelation('empresa', $empresaAtual);
        }

        return response()->json([
            'data' => new UsuarioResource($usuario),
            'permissoes' => $authService->listarPermissoes($usuario, $empresaId > 0 ? $empresaId : null),
            'termo_pendente' => $termoUsoService->pendente($usuario),
            'termo_aceite' => $termoUsoService->resumoAceite($termoUsoService->aceiteAtual($usuario)),
        ]);
    }

    public function logout(Request $request, AuthService $authService): JsonResponse
    {
        $authService->logout($request->user());

        return response()->json(['message' => 'Logout realizado com sucesso.']);
    }
}
