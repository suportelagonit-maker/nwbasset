<?php

namespace App\Domain\Administration\Actions;

use App\Domain\Administration\DTOs\PerfilData;
use App\Domain\Administration\Models\Perfil;
use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Support\Facades\DB;

class CreatePerfilAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(PerfilData $data, int $empresaId, Usuario $actor): Perfil
    {
        return DB::transaction(function () use ($data, $empresaId, $actor): Perfil {
            $perfil = Perfil::query()->create([
                ...$data->attributes,
                'empresa_id' => $empresaId,
                'status' => $data->attributes['status'] ?? StatusRegistroEnum::ATIVO->value,
            ]);

            $perfil->permissoes()->syncWithPivotValues($data->permissaoIds, ['empresa_id' => $empresaId]);

            $this->auditLogger->log(
                usuario: $actor,
                evento: AuditoriaEventoEnum::CRIACAO->value,
                entidade: $perfil,
                empresaId: $empresaId,
                dadosNovos: $perfil->fresh()->load('permissoes')->toArray(),
                descricao: 'Perfil cadastrado.',
            );

            return $perfil->load(['empresa', 'permissoes']);
        });
    }
}
