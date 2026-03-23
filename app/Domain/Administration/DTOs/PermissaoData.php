<?php

namespace App\Domain\Administration\DTOs;

final readonly class PermissaoData
{
    public function __construct(
        public array $attributes,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(attributes: $data);
    }
}
