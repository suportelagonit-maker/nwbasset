<?php

namespace App\Domain\Auth\Services;

use App\Domain\Auth\DTOs\NwbIdentidade;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Validacao do access token emitido pelo NWB ID (Keycloak, realm nwb-equipe).
 *
 * O token nao vira a sessao do NWB Asset: depois de conferir assinatura
 * (JWKS do realm), emissor, destinatario (azp/aud) e validade, ele e trocado
 * por um token Sanctum local, igual ao do login por senha. A claim "sistemas"
 * — mantida pelo NWB Acessos — diz quais sistemas a pessoa pode abrir.
 */
class NwbIdService
{
    public function configurado(): bool
    {
        return config('nwbid.issuer') !== '';
    }

    /** Senha so e aceita quando ligada explicitamente ou quando o NWB ID nao esta configurado. */
    public function loginSenhaPermitido(): bool
    {
        return (bool) config('nwbid.login_senha') || ! $this->configurado();
    }

    public function issuer(): string
    {
        $issuer = (string) config('nwbid.issuer');

        if ($issuer === '') {
            throw new RuntimeException('NWBID_ISSUER nao configurado.');
        }

        return $issuer;
    }

    /** Configuracao publica que o navegador precisa para iniciar o login. */
    public function configPublica(): array
    {
        return [
            'habilitado' => $this->configurado(),
            'issuer' => (string) config('nwbid.issuer'),
            'cliente' => (string) config('nwbid.cliente'),
            'sistema' => (string) config('nwbid.sistema'),
            'login_senha' => $this->loginSenhaPermitido(),
        ];
    }

    public function identidadeDoToken(string $token): NwbIdentidade
    {
        try {
            $payload = (array) JWT::decode($token, $this->chaves());
        } catch (Throwable) {
            throw new AuthenticationException('Nao foi possivel validar sua entrada pelo NWB ID. Entre de novo.');
        }

        if (($payload['iss'] ?? null) !== $this->issuer()) {
            throw new AuthenticationException('Token emitido por outro provedor de identidade.');
        }

        $azp = $this->texto($payload['azp'] ?? null) ?? '';
        $aud = array_merge($this->lista($payload['aud'] ?? null), array_filter([$this->texto($payload['aud'] ?? null)]));
        $aceitos = (array) config('nwbid.clientes_aceitos');

        if (! in_array($azp, $aceitos, true) && array_intersect($aud, $aceitos) === []) {
            throw new AuthenticationException('Esse acesso foi emitido para outro sistema.');
        }

        $sub = $this->texto($payload['sub'] ?? null);

        if ($sub === null) {
            throw new AuthenticationException('Token sem identificacao de pessoa.');
        }

        $nome = $this->texto($payload['nome_exibicao'] ?? null)
            ?? $this->texto($payload['name'] ?? null)
            ?? (trim(implode(' ', array_filter([$this->texto($payload['given_name'] ?? null), $this->texto($payload['family_name'] ?? null)]))) ?: null)
            ?? $this->texto($payload['preferred_username'] ?? null)
            ?? 'Sem nome';

        return new NwbIdentidade(
            sub: $sub,
            nome: $nome,
            email: mb_strtolower($this->texto($payload['email'] ?? null) ?? ''),
            sistemas: $this->lista($payload['sistemas'] ?? null),
            campus: $this->lista($payload['campus'] ?? null),
            nwbCadastroId: $this->texto($payload['nwb_cadastro_id'] ?? null),
        );
    }

    /** A pessoa pode abrir o NWB Asset segundo a claim "sistemas"? */
    public function podeAbrirSistema(NwbIdentidade $identidade): bool
    {
        return in_array((string) config('nwbid.sistema'), $identidade->sistemas, true);
    }

    /** Chaves publicas do realm (JWKS), em cache. */
    private function chaves(): array
    {
        $issuer = $this->issuer();

        $jwks = Cache::remember('nwbid.jwks.'.md5($issuer), (int) config('nwbid.jwks_cache_segundos'), function () use ($issuer): array {
            $response = Http::timeout((int) config('nwbid.timeout_segundos'))
                ->withHeaders(['User-Agent' => 'nwb-asset/1.0 (+nwbasset.igrejanovoscomecos.com.br)'])
                ->get($issuer.'/protocol/openid-connect/certs');

            if (! $response->ok()) {
                throw new RuntimeException('NWB ID nao devolveu as chaves publicas (HTTP '.$response->status().').');
            }

            return $response->json();
        });

        return JWK::parseKeySet($jwks, 'RS256');
    }

    private function texto(mixed $valor): ?string
    {
        return is_string($valor) && $valor !== '' ? $valor : null;
    }

    /** @return string[] */
    private function lista(mixed $valor): array
    {
        return is_array($valor) ? array_values(array_filter($valor, 'is_string')) : [];
    }
}
