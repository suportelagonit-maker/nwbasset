<?php

namespace App\Domain\Organization\Support;

use App\Domain\Organization\Models\Filial;
use App\Domain\Shared\Services\CodigoCadastroService;

class FilialCodigoManager
{
    public function __construct(
        private readonly CodigoCadastroService $codigoCadastroService,
    ) {
    }

    public function aplicar(Filial $filial): void
    {
        $this->codigoCadastroService->aplicar($filial, $filial->matriz ? 'MAT' : 'FIL');
    }

    public function sincronizarEmpresa(int $empresaId): void
    {
        Filial::query()
            ->where('empresa_id', $empresaId)
            ->orderBy('id')
            ->get()
            ->each(fn (Filial $filial) => $this->aplicar($filial));
    }
}
