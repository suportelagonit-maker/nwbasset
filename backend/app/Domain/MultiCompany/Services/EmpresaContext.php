<?php

namespace App\Domain\MultiCompany\Services;

use App\Domain\MultiCompany\Exceptions\EmpresaContextNotFoundException;

class EmpresaContext
{
    public function __construct(
        private ?int $empresaId = null,
    ) {
    }

    public function setId(int $empresaId): void
    {
        $this->empresaId = $empresaId;
    }

    public function id(): ?int
    {
        return $this->empresaId;
    }

    public function requiredId(): int
    {
        if ($this->empresaId === null) {
            throw new EmpresaContextNotFoundException();
        }

        return $this->empresaId;
    }
}
