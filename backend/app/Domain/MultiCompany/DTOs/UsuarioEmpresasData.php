<?php

namespace App\Domain\MultiCompany\DTOs;

final readonly class UsuarioEmpresasData
{
    public function __construct(
        public array $empresaIds,
        public ?int $empresaPadraoId,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            empresaIds: $data['empresa_ids'],
            empresaPadraoId: $data['empresa_padrao_id'] ?? null,
        );
    }
}
