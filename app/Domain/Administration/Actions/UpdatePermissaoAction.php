<?php

namespace App\Domain\Administration\Actions;

use App\Domain\Administration\DTOs\PermissaoData;
use App\Domain\Administration\Models\Permissao;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;

class UpdatePermissaoAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(Permissao $permissao, PermissaoData $data, Usuario $actor): Permissao
    {
        $dadosAnteriores = $permissao->toArray();
        $permissao->fill($data->attributes)->save();

        $this->auditLogger->log(
            usuario: $actor,
            evento: AuditoriaEventoEnum::ATUALIZACAO->value,
            entidade: $permissao,
            empresaId: $permissao->empresa_id,
            dadosAnteriores: $dadosAnteriores,
            dadosNovos: $permissao->fresh()->toArray(),
            descricao: 'Permissão atualizada.',
        );

        return $permissao->fresh('empresa');
    }
}
