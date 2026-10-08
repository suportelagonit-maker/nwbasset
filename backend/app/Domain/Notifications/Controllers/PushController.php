<?php

namespace App\Domain\Notifications\Controllers;

use App\Domain\Notifications\Enums\AvisoAcessoEnum;
use App\Domain\Notifications\Services\AvisoAcessoService;
use App\Domain\Notifications\Services\PushService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Avisos push do proprio usuario: inscricao do aparelho e preferencias.
 *
 * Tudo aqui e sobre quem esta logado — ninguem mexe no aviso de outra
 * pessoa, nem administrador.
 */
class PushController extends Controller
{
    public function __construct(
        private readonly PushService $pushService,
        private readonly AvisoAcessoService $avisoAcessoService,
    ) {
    }

    /** Estado dos avisos para a tela do perfil. */
    public function show(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $administrador = $this->avisoAcessoService->ehAdministrador($usuario);

        return response()->json([
            'data' => [
                'configurado' => $this->pushService->configurado(),
                'chave_publica' => $this->pushService->chavePublica(),
                'aparelhos' => $this->pushService->aparelhosDe($usuario),
                'preferencias' => $this->pushService->preferencias($usuario, $administrador),
                'assuntos' => array_map(
                    static fn (AvisoAcessoEnum $assunto): array => [
                        'chave' => $assunto->value,
                        'titulo' => $assunto->titulo(),
                        'descricao' => $assunto->descricao(),
                        'somente_administradores' => $assunto->somenteAdministradores(),
                    ],
                    AvisoAcessoEnum::disponiveisPara($administrador),
                ),
            ],
        ]);
    }

    public function assinar(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'endpoint' => ['required', 'string', 'max:2000', 'url'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ], [], [
            'endpoint' => 'endereço do aparelho',
            'keys.p256dh' => 'chave do aparelho',
            'keys.auth' => 'segredo do aparelho',
        ]);

        $this->pushService->assinar(
            $request->user(),
            $dados['endpoint'],
            $dados['keys']['p256dh'],
            $dados['keys']['auth'],
            $request->userAgent(),
        );

        return response()->json([
            'message' => 'Aparelho inscrito para receber avisos.',
            'data' => ['aparelhos' => $this->pushService->aparelhosDe($request->user())],
        ]);
    }

    public function desassinar(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'endpoint' => ['required', 'string', 'max:2000'],
        ]);

        $this->pushService->desassinar($dados['endpoint']);

        return response()->json([
            'message' => 'Aparelho não receberá mais avisos.',
            'data' => ['aparelhos' => $this->pushService->aparelhosDe($request->user())],
        ]);
    }

    public function preferencias(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $administrador = $this->avisoAcessoService->ehAdministrador($usuario);

        $dados = $request->validate([
            'preferencias' => ['required', 'array'],
            'preferencias.*' => ['boolean'],
        ]);

        return response()->json([
            'message' => 'Preferências de aviso salvas.',
            'data' => [
                'preferencias' => $this->pushService->salvarPreferencias(
                    $usuario,
                    $dados['preferencias'],
                    $administrador,
                ),
            ],
        ]);
    }

    /** Dispara um aviso de teste para os aparelhos da propria pessoa. */
    public function teste(Request $request): JsonResponse
    {
        $entregues = $this->pushService->avisarTeste($request->user());

        return response()->json([
            'message' => $entregues > 0
                ? 'Aviso de teste enviado. Ele deve aparecer em instantes.'
                : 'Nenhum aparelho recebeu o aviso. Ative os avisos neste aparelho e tente de novo.',
            'data' => ['entregues' => $entregues],
        ]);
    }
}
