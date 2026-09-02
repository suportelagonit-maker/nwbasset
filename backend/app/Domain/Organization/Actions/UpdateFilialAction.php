<?php

namespace App\Domain\Organization\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Organization\DTOs\FilialData;
use App\Domain\Organization\Models\Filial;
use App\Domain\Organization\Support\FilialCodigoManager;
use Illuminate\Support\Facades\DB;

class UpdateFilialAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly FilialCodigoManager $filialCodigoManager,
    ) {
    }

    public function execute(Filial $filial, FilialData $data, Usuario $actor): Filial
    {
        $dadosAnteriores = $filial->toArray();

        $filial = DB::transaction(function () use ($filial, $data): Filial {
            $definirComoMatriz = array_key_exists('matriz', $data->attributes)
                ? (bool) $data->attributes['matriz']
                : $filial->matriz;

            if ($definirComoMatriz) {
                Filial::query()
                    ->where('empresa_id', $filial->empresa_id)
                    ->whereKeyNot($filial->id)
                    ->update(['matriz' => false]);
            }

            $filial->fill(array_diff_key($data->attributes, ['codigo' => true]));
            $filial->matriz = $definirComoMatriz;

            if (! $filial->matriz) {
                $existeOutraMatriz = Filial::query()
                    ->where('empresa_id', $filial->empresa_id)
                    ->whereKeyNot($filial->id)
                    ->where('matriz', true)
                    ->exists();

                if (! $existeOutraMatriz) {
                    $filial->matriz = true;
                }
            }

            $filial->save();

            $this->filialCodigoManager->sincronizarEmpresa($filial->empresa_id);

            return $filial;
        });

        $this->auditLogger->log(
            usuario: $actor,
            evento: AuditoriaEventoEnum::ATUALIZACAO->value,
            entidade: $filial,
            empresaId: $filial->empresa_id,
            dadosAnteriores: $dadosAnteriores,
            dadosNovos: $filial->fresh()->toArray(),
            descricao: 'Filial atualizada.',
        );

        return $filial->fresh('empresa');
    }
}
