<?php

namespace App\Domain\Notifications\Support;

/**
 * Nome curto do aparelho para aparecer no aviso: "Chrome no Android".
 *
 * Nao e identificacao, e reconhecimento: a pessoa precisa bater o olho e
 * saber se aquele acesso foi dela. Por isso navegador e sistema bastam, sem
 * versao nem modelo.
 */
final class ApelidoDoAparelho
{
    public static function de(?string $userAgent): string
    {
        $agente = (string) $userAgent;

        if (trim($agente) === '') {
            return 'um aparelho desconhecido';
        }

        $navegador = self::navegador($agente);
        $sistema = self::sistema($agente);

        if ($navegador === null && $sistema === null) {
            return 'um aparelho desconhecido';
        }

        if ($sistema === null) {
            return $navegador ?? 'um aparelho desconhecido';
        }

        return $navegador === null ? $sistema : $navegador.' no '.$sistema;
    }

    private static function navegador(string $agente): ?string
    {
        // A ordem importa: Edge e Opera tambem se dizem Chrome, e o Chrome
        // tambem se diz Safari.
        return match (true) {
            str_contains($agente, 'Edg/') => 'Edge',
            str_contains($agente, 'OPR/') => 'Opera',
            str_contains($agente, 'SamsungBrowser') => 'Samsung Internet',
            str_contains($agente, 'Firefox') => 'Firefox',
            str_contains($agente, 'Chrome') => 'Chrome',
            str_contains($agente, 'Safari') => 'Safari',
            default => null,
        };
    }

    private static function sistema(string $agente): ?string
    {
        return match (true) {
            str_contains($agente, 'Android') => 'Android',
            str_contains($agente, 'iPhone') => 'iPhone',
            str_contains($agente, 'iPad') => 'iPad',
            str_contains($agente, 'Windows') => 'Windows',
            str_contains($agente, 'Macintosh') || str_contains($agente, 'Mac OS') => 'Mac',
            str_contains($agente, 'Linux') => 'Linux',
            default => null,
        };
    }
}
