<?php

namespace App\Domain\Notifications\Services;

use App\Domain\Auth\Models\Usuario;
use App\Domain\Notifications\Contracts\EnviadorPush;
use App\Domain\Notifications\Enums\AvisoAcessoEnum;
use App\Domain\Notifications\Models\PushAssinatura;
use App\Domain\Notifications\Models\PushPreferencia;
use Illuminate\Support\Facades\Log;

/**
 * Inscricoes, preferencias e entrega dos avisos push.
 *
 * Quem decide *quando* avisar e o AvisoAcessoService; aqui mora o *como*.
 */
class PushService
{
    public function __construct(private readonly EnviadorPush $enviador)
    {
    }

    public function configurado(): bool
    {
        return $this->enviador->configurado();
    }

    public function chavePublica(): ?string
    {
        $chave = config('push.vapid.publica');

        return is_string($chave) && $chave !== '' ? $chave : null;
    }

    /**
     * Guarda (ou reassume) a inscricao de um aparelho.
     *
     * O mesmo endpoint pode voltar com outro dono — computador compartilhado,
     * pessoa que trocou de conta. Nesse caso ele muda de dono em vez de
     * duplicar: dois donos para o mesmo aparelho fariam o aviso de uma
     * pessoa tocar no bolso da outra.
     */
    public function assinar(Usuario $usuario, string $endpoint, string $p256dh, string $auth, ?string $userAgent): PushAssinatura
    {
        return PushAssinatura::query()->updateOrCreate(
            ['endpoint_hash' => PushAssinatura::hashDoEndpoint($endpoint)],
            [
                'usuario_id' => $usuario->id,
                'endpoint' => $endpoint,
                'p256dh' => $p256dh,
                'auth' => $auth,
                'user_agent' => $userAgent === null ? null : mb_substr($userAgent, 0, 500),
                'falhas' => 0,
            ],
        );
    }

    public function desassinar(string $endpoint): void
    {
        PushAssinatura::query()
            ->where('endpoint_hash', PushAssinatura::hashDoEndpoint($endpoint))
            ->delete();
    }

    public function aparelhosDe(Usuario $usuario): int
    {
        return PushAssinatura::query()->where('usuario_id', $usuario->id)->count();
    }

    /**
     * Preferencias efetivas da pessoa: o padrao de cada assunto disponivel
     * para ela, sobrescrito pelo que ela tiver escolhido.
     *
     * @return array<string, bool>
     */
    public function preferencias(Usuario $usuario, bool $administrador): array
    {
        $escolhas = PushPreferencia::query()
            ->where('usuario_id', $usuario->id)
            ->pluck('ativo', 'assunto');

        $efetivas = [];

        foreach (AvisoAcessoEnum::disponiveisPara($administrador) as $assunto) {
            $efetivas[$assunto->value] = (bool) ($escolhas[$assunto->value] ?? $assunto->ligadoPorPadrao());
        }

        return $efetivas;
    }

    /**
     * @param  array<string, bool>  $escolhas
     * @return array<string, bool>
     */
    public function salvarPreferencias(Usuario $usuario, array $escolhas, bool $administrador): array
    {
        $permitidos = array_map(
            static fn (AvisoAcessoEnum $assunto): string => $assunto->value,
            AvisoAcessoEnum::disponiveisPara($administrador),
        );

        foreach ($escolhas as $assunto => $ativo) {
            if (! in_array($assunto, $permitidos, true)) {
                continue;
            }

            PushPreferencia::query()->updateOrCreate(
                ['usuario_id' => $usuario->id, 'assunto' => $assunto],
                ['ativo' => (bool) $ativo],
            );
        }

        return $this->preferencias($usuario, $administrador);
    }

    public function querReceber(Usuario $usuario, AvisoAcessoEnum $assunto): bool
    {
        $escolha = PushPreferencia::query()
            ->where('usuario_id', $usuario->id)
            ->where('assunto', $assunto->value)
            ->value('ativo');

        return $escolha === null ? $assunto->ligadoPorPadrao() : (bool) $escolha;
    }

    /**
     * Envia um aviso para todos os aparelhos da pessoa.
     *
     * Devolve quantos aparelhos receberam. Zero nao e erro: pode ser que a
     * pessoa nunca tenha ativado os avisos.
     */
    public function avisar(Usuario $usuario, AvisoAcessoEnum $assunto, string $titulo, string $corpo, ?string $destino = null): int
    {
        if (! $this->configurado() || ! $this->querReceber($usuario, $assunto)) {
            return 0;
        }

        $assinaturas = PushAssinatura::query()->where('usuario_id', $usuario->id)->get()->all();

        return $this->despachar($assinaturas, [
            'title' => $titulo,
            'body' => $corpo,
            'url' => $destino ?? $assunto->destino(),
            'tag' => $assunto->value,
        ]);
    }

    /** Aviso de teste, disparado pela propria pessoa na tela do perfil. */
    public function avisarTeste(Usuario $usuario): int
    {
        if (! $this->configurado()) {
            return 0;
        }

        $assinaturas = PushAssinatura::query()->where('usuario_id', $usuario->id)->get()->all();

        return $this->despachar($assinaturas, [
            'title' => 'NWB Asset',
            'body' => 'Aviso de teste: os avisos estão funcionando neste aparelho.',
            'url' => '/perfil',
            'tag' => 'TESTE',
        ]);
    }

    /**
     * @param  array<int, PushAssinatura>  $assinaturas
     * @param  array<string, mixed>  $payload
     */
    private function despachar(array $assinaturas, array $payload): int
    {
        if ($assinaturas === []) {
            return 0;
        }

        $resultados = $this->enviador->enviar($assinaturas, $payload);
        $entregues = 0;
        $maxFalhas = (int) config('push.max_falhas', 5);

        foreach ($resultados as $resultado) {
            if ($resultado->entregue) {
                $entregues++;
                PushAssinatura::query()->whereKey($resultado->assinaturaId)->update([
                    'falhas' => 0,
                    'ultimo_envio_em' => now(),
                ]);

                continue;
            }

            if ($resultado->expirada) {
                // O aparelho desinstalou o app ou revogou a permissao: a
                // inscricao nunca mais vai funcionar.
                PushAssinatura::query()->whereKey($resultado->assinaturaId)->delete();

                continue;
            }

            $assinatura = PushAssinatura::query()->find($resultado->assinaturaId);

            if ($assinatura === null) {
                continue;
            }

            $assinatura->increment('falhas');

            if ($assinatura->falhas >= $maxFalhas) {
                $assinatura->delete();
            }

            Log::warning('push: falha ao enviar aviso', [
                'assinatura_id' => $resultado->assinaturaId,
                'motivo' => $resultado->motivo,
            ]);
        }

        return $entregues;
    }
}
