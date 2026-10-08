<?php

namespace App\Domain\Notifications\Support;

/**
 * O que aconteceu com um aviso enviado para um aparelho.
 *
 * `expirada` separa os dois tipos de fracasso: a inscricao que morreu (o
 * servico de push responde 404 ou 410 e ela nunca mais vai funcionar, entao
 * apagamos) da falha passageira (rede, 5xx), que so conta falha.
 */
final readonly class ResultadoEnvio
{
    public function __construct(
        public int $assinaturaId,
        public bool $entregue,
        public bool $expirada = false,
        public ?string $motivo = null,
    ) {
    }

    public static function entregue(int $assinaturaId): self
    {
        return new self($assinaturaId, true);
    }

    public static function expirada(int $assinaturaId, ?string $motivo = null): self
    {
        return new self($assinaturaId, false, true, $motivo);
    }

    public static function falhou(int $assinaturaId, ?string $motivo = null): self
    {
        return new self($assinaturaId, false, false, $motivo);
    }
}
