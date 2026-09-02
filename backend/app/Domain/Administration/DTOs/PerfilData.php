<?php

namespace App\Domain\Administration\DTOs;

use Illuminate\Support\Arr;

final readonly class PerfilData
{
    public function __construct(
        public array $attributes,
        public array $permissaoIds,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            attributes: Arr::except($data, ['permissao_ids']),
            permissaoIds: $data['permissao_ids'] ?? [],
        );
    }
}
