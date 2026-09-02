<?php

namespace App\Domain\Administration\Actions;

use App\Domain\Administration\DTOs\PerfilData;
use App\Domain\Administration\Models\Perfil;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use Illuminate\Support\Facades\DB;

class UpdatePerfilAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(Perfil $perfil, PerfilData $data, Usuario $actor): Perfil
    {
        return DB::transaction(function () use ($perfil, $data, $actor): Perfil {
            $dadosAnteriores = $perfil->load('permissoes')->toArray();
            $perfil->fill($data->attributes)->save();
            $perfil->permissoes()->syncWithPivotValues($data->permissaoIds, ['empresa_id' => $perfil->empresa_id]);

            $this->auditLogger->log(
                usuario: $actor,
                evento: AuditoriaEventoEnum::ATUALIZACAO->value,
                entidade: $perfil,
                empresaId: $perfil->empresa_id,
                dadosAnteriores: $dadosAnteriores,
                dadosNovos: $perfil->fresh()->load('permissoes')->toArray(),
                descricao: 'Perfil atualizado.',
            );

            return $perfil->load(['empresa', 'permissoes']);
        });
    }
}
