<?php

namespace App\Domain\Organization\DTOs;

final readonly class FilialData
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
