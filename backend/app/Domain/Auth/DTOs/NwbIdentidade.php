<?php

namespace App\Domain\Auth\DTOs;

/** Identidade extraida de um access token valido do NWB ID. */
final readonly class NwbIdentidade
{
    /**
     * @param  string[]  $sistemas  codigos dos sistemas liberados pelo NWB Acessos
     * @param  string[]  $campus
     */
    public function __construct(
        public string $sub,
        public string $nome,
        public string $email,
        public array $sistemas,
        public array $campus = [],
        public ?string $nwbCadastroId = null,
    ) {
    }
}
