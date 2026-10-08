<?php

namespace App\Domain\Notifications\Services;

use App\Domain\Notifications\Contracts\EnviadorPush;
use App\Domain\Notifications\Models\PushAssinatura;
use App\Domain\Notifications\Support\ResultadoEnvio;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Entrega pelo padrao Web Push: o servidor assina com VAPID e o servico de
 * push do proprio navegador entrega ao aparelho. Sem servico de terceiros e
 * sem custo.
 */
class WebPushEnviador implements EnviadorPush
{
    /**
     * O envio acontece depois da resposta (defer), mas com mod_php a conexao
     * so fecha no fim do processo: um servico de push lento seguraria a
     * entrada da pessoa. Cinco segundos e o teto.
     */
    private const SEGUNDOS_DE_ESPERA = 5;

    public function configurado(): bool
    {
        return is_string(config('push.vapid.publica')) && config('push.vapid.publica') !== ''
            && is_string(config('push.vapid.privada')) && config('push.vapid.privada') !== '';
    }

    /**
     * @param  array<int, PushAssinatura>  $assinaturas
     * @param  array<string, mixed>  $payload
     * @return array<int, ResultadoEnvio>
     */
    public function enviar(array $assinaturas, array $payload): array
    {
        if ($assinaturas === [] || ! $this->configurado()) {
            return [];
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => (string) config('push.vapid.assunto'),
                'publicKey' => (string) config('push.vapid.publica'),
                'privateKey' => (string) config('push.vapid.privada'),
            ],
        ], ['TTL' => (int) config('push.ttl', 43200)], self::SEGUNDOS_DE_ESPERA);

        $webPush->setReuseVAPIDHeaders(true);

        $corpo = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $porEndpoint = [];
        $resultados = [];

        foreach ($assinaturas as $assinatura) {
            $porEndpoint[$assinatura->endpoint] = $assinatura->id;

            try {
                $webPush->queueNotification(
                    Subscription::create([
                        'endpoint' => $assinatura->endpoint,
                        'publicKey' => $assinatura->p256dh,
                        'authToken' => $assinatura->auth,
                        'contentEncoding' => 'aes128gcm',
                    ]),
                    $corpo === false ? null : $corpo,
                );
            } catch (Throwable $erro) {
                // Inscricao com chave corrompida nem chega a ser enviada.
                $resultados[] = ResultadoEnvio::expirada($assinatura->id, $erro->getMessage());
            }
        }

        foreach ($webPush->flush() as $relatorio) {
            $endpoint = $relatorio->getRequest()->getUri()->__toString();
            $id = $porEndpoint[$endpoint] ?? null;

            if ($id === null) {
                continue;
            }

            if ($relatorio->isSuccess()) {
                $resultados[] = ResultadoEnvio::entregue($id);

                continue;
            }

            $resultados[] = $relatorio->isSubscriptionExpired()
                ? ResultadoEnvio::expirada($id, $relatorio->getReason())
                : ResultadoEnvio::falhou($id, $relatorio->getReason());
        }

        return $resultados;
    }
}
