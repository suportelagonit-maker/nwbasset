<?php

namespace App\Domain\Auth\DTOs;

final readonly class UsuarioData
{
    public function __construct(
        public array $attributes,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            attributes: $data,
        );
    }
}
