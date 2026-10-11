<?php

namespace App\Domain\Inventory\Services;

use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Inventory\Enums\InventarioStatusEnum;
use App\Domain\Inventory\Enums\TipoDivergenciaInventarioEnum;
use App\Domain\Inventory\Models\ConciliacaoPatrimonial;
use App\Domain\Inventory\Models\DivergenciaInventario;
use App\Domain\Inventory\Models\Inventario;
use App\Domain\Inventory\Models\InventarioItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventarioService
{
    public function criarInventario(array $data): Inventario
    {
        return DB::transaction(function () use ($data): Inventario {
            $inventario = Inventario::query()->create([
                ...$data,
                'status' => $data['status'] ?? InventarioStatusEnum::ABERTO->value,
            ]);

            $this->carregarBensDaEmpresa($inventario);
            app(LogOperacaoPatrimonialService::class)->registrar(
                'INVENTARIO_CRIADO',
                $inventario,
                $inventario->empresa_id,
                [],
                $inventario->toArray(),
            );

            return $inventario->fresh();
        });
    }

    public function atualizarInventarioItem(InventarioItem $item, array $data): InventarioItem
    {
        return DB::transaction(function () use ($item, $data): InventarioItem {
            $inventario = $item->inventario()->lockForUpdate()->firstOrFail();

            if ($inventario->status === InventarioStatusEnum::FINALIZADO->value) {
                throw ValidationException::withMessages([
                    'inventario_id' => 'Nao e permitido alterar itens de um inventario finalizado.',
                ]);
            }

            $payload = $data;

            if (($data['localizado'] ?? null) === true && empty($data['data_verificacao'])) {
                $payload['data_verificacao'] = Carbon::today()->toDateString();
            }

            $item->update($payload);

            if ($inventario->status === InventarioStatusEnum::ABERTO->value) {
                $inventario->update(['status' => InventarioStatusEnum::EM_ANDAMENTO->value]);
            }

            app(LogOperacaoPatrimonialService::class)->registrar(
                'INVENTARIO_ITEM_ATUALIZADO',
                $item,
                $inventario->empresa_id,
                [],
                $item->fresh()->toArray(),
            );

            return $item->fresh();
        });
    }

    public function registrarConciliacao(array $data): ConciliacaoPatrimonial
    {
        return DB::transaction(function () use ($data): ConciliacaoPatrimonial {
            $inventario = Inventario::query()->lockForUpdate()->findOrFail($data['inventario_id']);

            return $this->reconciliarInventario(
                $inventario,
                Carbon::parse($data['data_conciliacao'])->toDateString(),
            );
        });
    }

    public function atualizarConciliacao(ConciliacaoPatrimonial $conciliacao, array $data): ConciliacaoPatrimonial
    {
        return DB::transaction(function () use ($conciliacao, $data): ConciliacaoPatrimonial {
            $inventario = $conciliacao->inventario()->lockForUpdate()->firstOrFail();
            $dataConciliacao = Carbon::parse($data['data_conciliacao'] ?? $conciliacao->data_conciliacao)->toDateString();

            return $this->reconciliarInventario($inventario, $dataConciliacao);
        });
    }

    /**
     * Monta a lista do que tem de ser contado.
     *
     * Quando o inventario e de uma filial, so os bens dela entram: contar a
     * filial A e ver os bens da filial B aparecendo como "nao encontrados"
     * transformaria toda conciliacao em uma lista de falsas divergencias.
     *
     * Bem ja baixado tambem fica de fora — ele nao existe mais para ser
     * encontrado.
     */
    protected function carregarBensDaEmpresa(Inventario $inventario): void
    {
        BemPatrimonial::query()
            ->where('empresa_id', $inventario->empresa_id)
            ->when($inventario->filial_id, fn ($consulta) => $consulta->where('filial_id', $inventario->filial_id))
            ->where(fn ($consulta) => $consulta->whereNull('status_bem')->orWhere('status_bem', '!=', 'baixado'))
            ->orderBy('numero_tombo')
            ->get()
            ->each(function (BemPatrimonial $bem) use ($inventario): void {
                InventarioItem::query()->firstOrCreate(
                    [
                        'inventario_id' => $inventario->id,
                        'bem_patrimonial_id' => $bem->id,
                    ],
                    [
                        'localizado' => false,
                    ],
                );
            });
    }

    protected function reconciliarInventario(Inventario $inventario, string $dataConciliacao): ConciliacaoPatrimonial
    {
        $totalBensSistema = $inventario->itens()->count();
        $totalBensEncontrados = $inventario->itens()->where('localizado', true)->count();
        $divergencias = $this->regenerarDivergencias($inventario);

        $conciliacao = ConciliacaoPatrimonial::query()->updateOrCreate(
            ['inventario_id' => $inventario->id],
            [
                'total_bens_sistema' => $totalBensSistema,
                'total_bens_encontrados' => $totalBensEncontrados,
                'divergencias' => $divergencias,
                'data_conciliacao' => $dataConciliacao,
            ],
        );

        $inventario->update([
            'status' => InventarioStatusEnum::FINALIZADO->value,
            'data_fim' => $inventario->data_fim ?? $dataConciliacao,
        ]);

        app(LogOperacaoPatrimonialService::class)->registrar(
            'INVENTARIO_CONCILIADO',
            $conciliacao,
            $inventario->empresa_id,
            [],
            $conciliacao->toArray(),
        );

        return $conciliacao->fresh();
    }

    protected function regenerarDivergencias(Inventario $inventario): int
    {
        $inventario->divergencias()->delete();

        $inventario->itens()
            ->with('bemPatrimonial')
            ->get()
            ->each(function (InventarioItem $item) use ($inventario): void {
                $bem = $item->bemPatrimonial;

                if (! $bem) {
                    return;
                }

                if (! $item->localizado) {
                    DivergenciaInventario::query()->create([
                        'inventario_id' => $inventario->id,
                        'bem_patrimonial_id' => $bem->id,
                        'tipo_divergencia' => TipoDivergenciaInventarioEnum::NAO_ENCONTRADO->value,
                        'descricao' => 'Bem nao localizado durante o inventario.',
                    ]);
                }

                // Achado mais comum de um inventario: o bem existe, mas nao
                // esta onde o cadastro diz.
                if (
                    $item->localizado
                    && $item->local_encontrado_id
                    && $bem->local_id
                    && (int) $item->local_encontrado_id !== (int) $bem->local_id
                ) {
                    DivergenciaInventario::query()->create([
                        'inventario_id' => $inventario->id,
                        'bem_patrimonial_id' => $bem->id,
                        'tipo_divergencia' => TipoDivergenciaInventarioEnum::LOCAL_DIFERENTE->value,
                        'descricao' => sprintf(
                            'Encontrado em local diferente do cadastro (cadastrado em %s, encontrado em %s).',
                            $bem->local?->nome ?? 'local nao informado',
                            $item->localEncontrado?->nome ?? 'local nao informado',
                        ),
                    ]);
                }

                if (blank($bem->numero_tombo)) {
                    DivergenciaInventario::query()->create([
                        'inventario_id' => $inventario->id,
                        'bem_patrimonial_id' => $bem->id,
                        'tipo_divergencia' => TipoDivergenciaInventarioEnum::SEM_TOMBO->value,
                        'descricao' => 'Bem identificado sem numero de tombo no cadastro.',
                    ]);
                }
            });

        return $inventario->divergencias()->count();
    }
}
