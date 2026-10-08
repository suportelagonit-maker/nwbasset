<?php

namespace App\Domain\Notifications\Support;

/**
 * IP como a pessoa reconhece.
 *
 * Quando o cliente chega por IPv4 numa pilha IPv6, o PHP entrega
 * "::ffff:200.1.2.3". No aviso isso so atrapalha: o que ajuda alguem a dizer
 * "fui eu" e o endereco limpo.
 */
final class IpLegivel
{
    public static function de(?string $ip): ?string
    {
        $endereco = trim((string) $ip);

        if ($endereco === '') {
            return null;
        }

        if (str_starts_with(strtolower($endereco), '::ffff:')) {
            $endereco = substr($endereco, 7);
        }

        return $endereco === '' ? null : $endereco;
    }
}
