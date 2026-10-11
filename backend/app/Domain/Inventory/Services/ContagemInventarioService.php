<?php

namespace App\Domain\Inventory\Services;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Services\PlaquetaPatrimonialService;
use App\Domain\Auth\Models\Usuario;
use App\Domain\Inventory\Enums\InventarioStatusEnum;
use App\Domain\Inventory\Enums\ResultadoLeituraEnum;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Inventory\Models\InventarioItem;
use App\Domain\Inventory\Models\InventarioLeitura;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Contagem de inventário em campo.
 *
 * Recebe leituras de etiqueta — uma a uma, ou em lote quando o aparelho
 * estava sem rede — e devolve, para cada uma, o que o sistema concluiu.
 *
 * Duas decisões sustentam o uso em campo:
 *
 * 1. **Idempotência por leitura.** Cada leitura carrega um `origem_id`
 *    gerado no aparelho. Reenviar a mesma fila (porque a rede caiu no meio
 *    do envio) não conta nada duas vezes, e o operador não precisa saber o
 *    que já chegou e o que não chegou.
 *
 * 2. **Nenhuma leitura se perde.** Etiqueta que não casa com bem nenhum
 *    também é gravada. É ela que vira o achado "existe fisicamente e não
 *    está no cadastro" — justamente o que o inventário existe para
 *    descobrir.
 */
class ContagemInventarioService
{
    public function __construct(
        private readonly PlaquetaPatrimonialService $plaquetaService,
    ) {
    }

    /**
     * @param  array<int, array{codigo: string, origem_id?: string|null, local_id?: int|null, responsavel_id?: int|null, lido_em?: string|null, observacoes?: string|null}>  $leituras
     * @return array<string, mixed>
     */
    public function registrarLeituras(Inventario $inventario, array $leituras, ?Usuario $usuario = null): array
    {
        if ($inventario->status === InventarioStatusEnum::FINALIZADO->value) {
            throw ValidationException::withMessages([
                'inventario_id' => 'Este inventário já foi finalizado. Reabra antes de continuar a contagem.',
            ]);
        }

        $resultados = [];

        foreach ($leituras as $leitura) {
            $resultados[] = DB::transaction(
                fn (): array => $this->registrarUma($inventario, $leitura, $usuario),
            );
        }

        if ($inventario->status === InventarioStatusEnum::ABERTO->value && $resultados !== []) {
            $inventario->update(['status' => InventarioStatusEnum::EM_ANDAMENTO->value]);
        }

        return [
            'leituras' => $resultados,
            'resumo' => $this->resumo($inventario->fresh()),
        ];
    }

    /**
     * @param  array{codigo: string, origem_id?: string|null, local_id?: int|null, lido_em?: string|null, observacoes?: string|null}  $leitura
     * @return array<string, mixed>
     */
    private function registrarUma(Inventario $inventario, array $leitura, ?Usuario $usuario): array
    {
        $codigo = trim((string) ($leitura['codigo'] ?? ''));
        $origemId = $leitura['origem_id'] ?? null;
        $localId = $leitura['local_id'] ?? null;
        $responsavelId = $leitura['responsavel_id'] ?? null;
        $lidoEm = Carbon::parse($leitura['lido_em'] ?? now());

        // A mesma leitura chegando de novo (reenvio da fila) devolve o que
        // ela já tinha concluído, sem contar outra vez.
        if ($origemId) {
            $jaGravada = InventarioLeitura::query()
                ->where('inventario_id', $inventario->id)
                ->where('origem_id', $origemId)
                ->first();

            if ($jaGravada) {
                return $this->descreverLeitura($jaGravada, true);
            }
        }

        $bem = $this->localizarBem($codigo, $inventario->empresa_id);
        $resultado = ResultadoLeituraEnum::NAO_IDENTIFICADO;
        $item = null;

        if ($bem) {
            $item = InventarioItem::query()
                ->where('inventario_id', $inventario->id)
                ->where('bem_patrimonial_id', $bem->id)
                ->first();

            if (! $item) {
                $resultado = ResultadoLeituraEnum::FORA_DO_INVENTARIO;
            } elseif ($item->localizado) {
                $resultado = ResultadoLeituraEnum::JA_CONTADO;
            } else {
                $foraDoLugar = $localId !== null
                    && $bem->local_id !== null
                    && (int) $localId !== (int) $bem->local_id;

                $outroResponsavel = $responsavelId !== null
                    && $bem->responsavel_id !== null
                    && (int) $responsavelId !== (int) $bem->responsavel_id;

                // O local fala mais alto que o responsavel: se as duas
                // coisas divergem, o operador precisa ver primeiro que o
                // bem mudou de lugar. A conciliacao aponta as duas.
                $resultado = match (true) {
                    $foraDoLugar => ResultadoLeituraEnum::LOCAL_DIFERENTE,
                    $outroResponsavel => ResultadoLeituraEnum::RESPONSAVEL_DIFERENTE,
                    default => ResultadoLeituraEnum::CONTADO,
                };

                $item->forceFill([
                    'localizado' => true,
                    'local_encontrado_id' => $localId,
                    'responsavel_encontrado_id' => $responsavelId,
                    'contado_em' => $lidoEm,
                    'contado_por' => $usuario?->id,
                    'codigo_lido' => mb_substr($codigo, 0, 120),
                    'data_verificacao' => $lidoEm->toDateString(),
                ])->save();
            }
        }

        $registro = InventarioLeitura::query()->create([
            'inventario_id' => $inventario->id,
            'bem_patrimonial_id' => $bem?->id,
            'local_id' => $localId,
            'codigo_lido' => mb_substr($codigo, 0, 120),
            'resultado' => $resultado->value,
            'origem_id' => $origemId,
            'lido_em' => $lidoEm,
            'lido_por' => $usuario?->id,
            'observacoes' => isset($leitura['observacoes'])
                ? mb_substr((string) $leitura['observacoes'], 0, 500)
                : null,
        ]);

        return $this->descreverLeitura($registro->load('bemPatrimonial'), false);
    }

    /**
     * Acha o bem pelo que foi lido: primeiro pela plaqueta (código de
     * barras, QR ou link de consulta), depois pelo número do tombo digitado
     * à mão.
     */
    private function localizarBem(string $codigo, int $empresaId): ?BemPatrimonial
    {
        if ($codigo === '') {
            return null;
        }

        $plaqueta = $this->plaquetaService->localizarPorCodigo($codigo);

        if ($plaqueta?->bemPatrimonial && (int) $plaqueta->bemPatrimonial->empresa_id === $empresaId) {
            return $plaqueta->bemPatrimonial;
        }

        $normalizado = $this->plaquetaService->normalizarCodigo($codigo);

        return BemPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->where(function ($consulta) use ($normalizado): void {
                $consulta->where('numero_tombo', $normalizado)
                    ->orWhere('numero_serie', $normalizado);
            })
            ->first();
    }

    /** @return array<string, mixed> */
    private function descreverLeitura(InventarioLeitura $leitura, bool $repetida): array
    {
        $resultado = ResultadoLeituraEnum::from($leitura->resultado);
        $bem = $leitura->bemPatrimonial;

        return [
            'origem_id' => $leitura->origem_id,
            'codigo' => $leitura->codigo_lido,
            'resultado' => $resultado->value,
            'mensagem' => $repetida ? 'Leitura já registrada antes.' : $resultado->mensagem(),
            'exige_atencao' => $resultado->exigeAtencao(),
            'bem' => $bem ? [
                'id' => $bem->id,
                'numero_tombo' => $bem->numero_tombo,
                'descricao' => $bem->descricao,
            ] : null,
        ];
    }

    /** @return array<string, mixed> */
    public function resumo(Inventario $inventario): array
    {
        $itens = InventarioItem::query()->where('inventario_id', $inventario->id);
        $total = (clone $itens)->count();
        $encontrados = (clone $itens)->where('localizado', true)->count();

        $foraDoLugar = (clone $itens)
            ->whereNotNull('local_encontrado_id')
            ->whereHas('bemPatrimonial', fn ($consulta) => $consulta->whereColumn(
                'bens_patrimoniais.local_id',
                '!=',
                'inventario_itens.local_encontrado_id',
            ))
            ->count();

        $outroResponsavel = (clone $itens)
            ->whereNotNull('responsavel_encontrado_id')
            ->whereHas('bemPatrimonial', fn ($consulta) => $consulta->whereColumn(
                'bens_patrimoniais.responsavel_id',
                '!=',
                'inventario_itens.responsavel_encontrado_id',
            ))
            ->count();

        $naoIdentificadas = InventarioLeitura::query()
            ->where('inventario_id', $inventario->id)
            ->where('resultado', ResultadoLeituraEnum::NAO_IDENTIFICADO->value)
            ->count();

        return [
            'inventario_id' => $inventario->id,
            'status' => $inventario->status,
            'total' => $total,
            'encontrados' => $encontrados,
            'pendentes' => max(0, $total - $encontrados),
            'percentual' => $total > 0 ? round(($encontrados / $total) * 100, 1) : 0.0,
            'local_diferente' => $foraDoLugar,
            'responsavel_diferente' => $outroResponsavel,
            'nao_identificadas' => $naoIdentificadas,
        ];
    }
}
