<?php

namespace App\Domain\Organization\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\DTOs\FilialData;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Support\FilialCodigoManager;
use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateFilialAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly FilialCodigoManager $filialCodigoManager,
    ) {
    }

    public function execute(FilialData $data, int $empresaId, Usuario $actor): Filial
    {
        $filial = DB::transaction(function () use ($data, $empresaId): Filial {
            $isFirstFilial = ! Filial::query()->where('empresa_id', $empresaId)->exists();
            $definirComoMatriz = $isFirstFilial || (bool) ($data->attributes['matriz'] ?? false);

            if ($definirComoMatriz) {
                Filial::query()
                    ->where('empresa_id', $empresaId)
                    ->update(['matriz' => false]);
            }

            $filial = Filial::query()->create([
                ...$data->attributes,
                'codigo' => 'TMP-'.Str::upper(Str::random(10)),
                'empresa_id' => $empresaId,
                'matriz' => $definirComoMatriz,
                'status' => $data->attributes['status'] ?? StatusRegistroEnum::ATIVO->value,
            ]);

            $this->filialCodigoManager->sincronizarEmpresa($empresaId);

            return $filial;
        });

        $this->auditLogger->log(
            usuario: $actor,
            evento: AuditoriaEventoEnum::CRIACAO->value,
            entidade: $filial,
            empresaId: $empresaId,
            dadosNovos: $filial->toArray(),
            descricao: 'Filial cadastrada.',
        );

        return $filial->fresh('empresa');
    }
}
