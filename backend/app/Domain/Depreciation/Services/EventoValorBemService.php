<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Depreciation\Enums\TipoEventoValorEnum;
use App\Domain\Depreciation\Models\EventoValorBem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Registra os eventos de valor de um bem (acrescimo, reavaliacao,
 * impairment, baixa parcial). Quem calcula o efeito no cronograma e o
 * CronogramaDepreciacaoService; aqui so guardamos, validando o basico.
 */
class EventoValorBemService
{
    /**
     * @param  array<string, mixed>  $dados
     */
    public function registrar(BemPatrimonial $bem, array $dados, ?Usuario $usuario = null): EventoValorBem
    {
        $tipo = (string) $dados['tipo'];
        $competencia = Carbon::parse($dados['competencia'])->startOfMonth();
        $valor = round((float) $dados['valor'], 2);

        if ($valor <= 0) {
            throw ValidationException::withMessages(['valor' => 'O valor do evento deve ser maior que zero.']);
        }

        // O evento nao pode ser anterior ao inicio da depreciacao do bem.
        $inicio = $bem->data_inicio_uso ?? $bem->data_aquisicao;

        if ($inicio && $competencia->lt(Carbon::parse($inicio)->startOfMonth())) {
            throw ValidationException::withMessages([
                'competencia' => 'O evento nao pode ser anterior ao inicio de uso do bem ('
                    .Carbon::parse($inicio)->format('m/Y').').',
            ]);
        }

        if ($tipo === TipoEventoValorEnum::BAIXA_PARCIAL->value && $valor >= (float) $bem->valor_aquisicao) {
            throw ValidationException::withMessages([
                'valor' => 'Baixa parcial nao pode remover o valor inteiro do bem. Use a baixa total.',
            ]);
        }

        return DB::transaction(function () use ($bem, $tipo, $competencia, $valor, $dados, $usuario): EventoValorBem {
            $evento = EventoValorBem::query()->create([
                'empresa_id' => $bem->empresa_id,
                'bem_patrimonial_id' => $bem->id,
                'tipo' => $tipo,
                'competencia' => $competencia->toDateString(),
                'valor' => $valor,
                'nova_vida_util_meses' => ! empty($dados['nova_vida_util_meses']) ? (int) $dados['nova_vida_util_meses'] : null,
                'descricao' => isset($dados['descricao']) ? mb_substr((string) $dados['descricao'], 0, 500) : null,
                'criado_por' => $usuario?->id,
            ]);

            app(LogOperacaoPatrimonialService::class)->registrar(
                'EVENTO_VALOR_BEM',
                $evento,
                $bem->empresa_id,
                [],
                $evento->toArray(),
            );

            return $evento;
        });
    }

    public function remover(EventoValorBem $evento): void
    {
        DB::transaction(function () use ($evento): void {
            $anterior = $evento->toArray();
            $evento->delete();

            app(LogOperacaoPatrimonialService::class)->registrar(
                'EVENTO_VALOR_BEM_REMOVIDO',
                $evento,
                (int) $anterior['empresa_id'],
                $anterior,
                [],
            );
        });
    }
}
