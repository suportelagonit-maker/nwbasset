<?php

namespace App\Domain\MultiCompany\Actions;

use App\Domain\Audit\Enums\AuditoriaEventoEnum;
use App\Domain\Audit\Services\AuditLogger;
use App\Domain\Auth\Models\Usuario;
use App\Domain\MultiCompany\DTOs\UsuarioEmpresasData;
use App\Domain\MultiCompany\Models\UsuarioEmpresa;
use App\Domain\Shared\Enums\StatusRegistroEnum;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SyncUsuarioEmpresasAction
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function execute(Usuario $target, UsuarioEmpresasData $data, Usuario $actor): Usuario
    {
        $permitidas = $actor->empresas()
            ->whereIn('empresas.id', $data->empresaIds)
            ->pluck('empresas.id')
            ->all();

        if (count($permitidas) !== count(array_unique($data->empresaIds))) {
            throw ValidationException::withMessages([
                'empresa_ids' => ['Você só pode associar usuários às empresas às quais possui acesso.'],
            ]);
        }

        return DB::transaction(function () use ($target, $data, $permitidas, $actor): Usuario {
            $empresaPadraoId = $data->empresaPadraoId ?? $permitidas[0];
            $dadosAnteriores = $target->empresas()->pluck('empresas.id')->all();

            UsuarioEmpresa::query()
                ->where('usuario_id', $target->id)
                ->whereNotIn('empresa_id', $permitidas)
                ->delete();

            UsuarioEmpresa::query()
                ->where('usuario_id', $target->id)
                ->update(['empresa_padrao' => false]);

            foreach ($permitidas as $empresaId) {
                UsuarioEmpresa::query()->updateOrCreate(
                    [
                        'usuario_id' => $target->id,
                        'empresa_id' => $empresaId,
                    ],
                    [
                        'empresa_padrao' => $empresaId === $empresaPadraoId,
                        'status' => StatusRegistroEnum::ATIVO->value,
                    ],
                );
            }

            $target->update(['empresa_id' => $empresaPadraoId]);

            $this->auditLogger->log(
                usuario: $actor,
                evento: AuditoriaEventoEnum::ASSOCIACAO->value,
                entidade: $target,
                empresaId: $empresaPadraoId,
                dadosAnteriores: ['empresa_ids' => $dadosAnteriores],
                dadosNovos: ['empresa_ids' => $permitidas, 'empresa_padrao_id' => $empresaPadraoId],
                descricao: 'Empresas do usuário sincronizadas.',
            );

            return $target->fresh(['empresa', 'empresas', 'filiais', 'perfis']);
        });
    }
}
