<?php

namespace App\Domain\Audit\Services;

use App\Domain\Audit\Models\LogOperacaoPatrimonial;
use App\Domain\Auth\Models\Usuario;
use Illuminate\Database\Eloquent\Model;

class LogOperacaoPatrimonialService
{
    public function registrar(
        string $operacao,
        Model|string $entidade,
        ?int $empresaId,
        array $dadosAnteriores = [],
        array $dadosNovos = [],
        ?Usuario $usuario = null,
    ): void {
        if ($empresaId === null || app()->runningInConsole()) {
            return;
        }

        $request = request();
        $usuario ??= $request?->user();

        LogOperacaoPatrimonial::query()->create([
            'empresa_id' => $empresaId,
            'usuario_id' => $usuario?->id,
            'operacao' => $operacao,
            'entidade' => $entidade instanceof Model ? $entidade::class : $entidade,
            'entidade_id' => $entidade instanceof Model ? $entidade->getKey() : null,
            'dados_anteriores' => $dadosAnteriores ?: null,
            'dados_novos' => $dadosNovos ?: null,
        ]);
    }
}
