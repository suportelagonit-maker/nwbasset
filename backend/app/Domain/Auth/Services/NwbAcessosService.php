<?php

namespace App\Domain\Auth\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Conversa com o NWB Acessos como SISTEMA (conta de servico nwb-asset-api),
 * para saber quem administra o NWB Asset la. Administrar nao poe o sistema
 * na claim "sistemas" — por isso a pergunta direta.
 *
 * Fora do ar ou sem configuracao, responde "nao administra": na duvida vale
 * so a claim, nunca abrir mais do que o Acessos liberou.
 */
class NwbAcessosService
{
    private const USER_AGENT = 'nwb-asset/1.0 (+nwbasset.igrejanovoscomecos.com.br)';

    public function __construct(private readonly NwbIdService $nwbIdService)
    {
    }

    public function configurado(): bool
    {
        $c = config('nwbid.acessos');

        return $this->nwbIdService->configurado() && $c['url'] !== '' && $c['client_id'] !== '' && $c['client_secret'] !== '';
    }

    public function administra(string $sub): bool
    {
        if (! $this->configurado()) {
            return false;
        }

        try {
            return in_array($sub, $this->administradores(), true);
        } catch (Throwable $erro) {
            Log::warning('nwb-acessos indisponivel', ['mensagem' => $erro->getMessage()]);

            return false;
        }
    }

    /** @return string[] subs de quem administra este sistema no Acessos (cache curto). */
    public function administradores(): array
    {
        return Cache::remember('nwbid.acessos.administradores', (int) config('nwbid.acessos_cache_segundos'), function (): array {
            $response = Http::timeout((int) config('nwbid.timeout_segundos'))
                ->withHeaders(['User-Agent' => self::USER_AGENT])
                ->withToken($this->tokenDeServico())
                ->get(config('nwbid.acessos.url').'/servico/administradores');

            if (! $response->ok()) {
                throw new RuntimeException('NWB Acessos respondeu HTTP '.$response->status());
            }

            $dados = $response->json('dados');

            if (! is_array($dados)) {
                throw new RuntimeException('NWB Acessos respondeu sem a lista de administradores.');
            }

            return array_values(array_filter(
                array_map(static fn ($item) => is_array($item) ? ($item['sub'] ?? null) : null, $dados),
                static fn ($sub) => is_string($sub) && $sub !== '',
            ));
        });
    }

    private function tokenDeServico(): string
    {
        return Cache::remember('nwbid.acessos.token', 60, function (): string {
            $response = Http::asForm()
                ->timeout((int) config('nwbid.timeout_segundos'))
                ->withHeaders(['User-Agent' => self::USER_AGENT])
                ->post($this->nwbIdService->issuer().'/protocol/openid-connect/token', [
                    'grant_type' => 'client_credentials',
                    'client_id' => config('nwbid.acessos.client_id'),
                    'client_secret' => config('nwbid.acessos.client_secret'),
                ]);

            if (! $response->ok() || ! is_string($response->json('access_token'))) {
                throw new RuntimeException('NWB ID recusou a conta de servico (HTTP '.$response->status().').');
            }

            return $response->json('access_token');
        });
    }
}
