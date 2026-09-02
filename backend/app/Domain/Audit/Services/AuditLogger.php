<?php

namespace App\Domain\Audit\Services;

use App\Domain\Audit\Models\AuditoriaEvento;
use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class AuditLogger
{
    public function log(
        ?Usuario $usuario,
        string $evento,
        Model|string $entidade,
        ?int $empresaId,
        array $dadosAnteriores = [],
        array $dadosNovos = [],
        ?string $descricao = null,
    ): void {
        if (! Schema::hasTable('auditoria_eventos')) {
            return;
        }

        $request = app()->runningInConsole() ? null : request();

        AuditoriaEvento::query()->create([
            'empresa_id' => $empresaId,
            'usuario_id' => $usuario?->id,
            'evento' => $evento,
            'entidade_tipo' => $entidade instanceof Model ? $entidade::class : $entidade,
            'entidade_id' => $entidade instanceof Model ? $entidade->getKey() : null,
            'descricao' => $descricao,
            'dados_anteriores' => $dadosAnteriores,
            'dados_novos' => $dadosNovos,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
