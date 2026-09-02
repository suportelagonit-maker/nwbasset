<?php

namespace App\Domain\Administration\Actions;

use App\Domain\Administration\DTOs\PermissaoData;
use App\Domain\Administration\Models\Permissao;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Shared\Enums\StatusRegistroEnum;

class CreatePermissaoAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(PermissaoData $data, int $empresaId, Usuario $actor): Permissao
    {
        $permissao = Permissao::query()->create([
            ...$data->attributes,
            'empresa_id' => $empresaId,
            'status' => $data->attributes['status'] ?? StatusRegistroEnum::ATIVO->value,
        ]);

        $this->auditLogger->log(
            usuario: $actor,
            evento: AuditoriaEventoEnum::CRIACAO->value,
            entidade: $permissao,
            empresaId: $empresaId,
            dadosNovos: $permissao->toArray(),
            descricao: 'Permissão cadastrada.',
        );

        return $permissao->fresh('empresa');
    }
}
