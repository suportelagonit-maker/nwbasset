<?php

namespace App\Domain\AssetMovements\Services;

use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\AssetMovements\Models\BaixaBem;
use App\Domain\AssetMovements\Models\HistoricoLocalizacaoBem;
use App\Domain\AssetMovements\Models\ResponsabilidadeBem;
use App\Domain\AssetMovements\Models\TransferenciaBem;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Responsavel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BemMovimentacaoService
{
    public function registrarHistoricoLocalizacao(array $data): HistoricoLocalizacaoBem
    {
        return DB::transaction(function () use ($data): HistoricoLocalizacaoBem {
            $bem = $this->obterBem($data['bem_patrimonial_id']);
            $this->assertBemContexto($bem, $data['empresa_id'], $data['filial_id']);

            $historico = HistoricoLocalizacaoBem::query()->create($data);
            $this->sincronizarLocalizacaoDoBem($bem->fresh());

            return $historico->fresh();
        });
    }

    public function atualizarHistoricoLocalizacao(HistoricoLocalizacaoBem $historico, array $data): HistoricoLocalizacaoBem
    {
        return DB::transaction(function () use ($historico, $data): HistoricoLocalizacaoBem {
            $bem = $this->obterBem($historico->bem_patrimonial_id);

            $historico->update($data);
            $this->sincronizarLocalizacaoDoBem($bem->fresh());

            return $historico->fresh();
        });
    }

    public function removerHistoricoLocalizacao(HistoricoLocalizacaoBem $historico): void
    {
        DB::transaction(function () use ($historico): void {
            $bem = $this->obterBem($historico->bem_patrimonial_id);

            $historico->delete();
            $this->sincronizarLocalizacaoDoBem($bem->fresh());
        });
    }

    public function registrarTransferencia(array $data): TransferenciaBem
    {
        return DB::transaction(function () use ($data): TransferenciaBem {
            $bem = $this->obterBem($data['bem_patrimonial_id']);
            $this->assertBemContexto($bem, $data['empresa_id'], $data['filial_id']);
            $this->assertBemNaoBaixado($bem);
            $data = $this->resolverResponsaveisDaTransferencia($bem, $data);
            $this->assertOrigemAtual($bem, $data);

            $transferencia = TransferenciaBem::query()->create($data);

            $this->encerrarHistoricoAtual($bem, $data['data_transferencia']);
            $this->criarHistoricoDestino($transferencia);
            $this->aplicarResponsavelDestinoNoBem($bem, $data);
            $this->sincronizarLocalizacaoDoBem($bem->fresh());
            app(LogOperacaoPatrimonialService::class)->registrar(
                'TRANSFERENCIA_BEM',
                $transferencia,
                $transferencia->empresa_id,
                [],
                $transferencia->toArray(),
            );

            return $transferencia->fresh();
        });
    }

    public function atualizarTransferencia(TransferenciaBem $transferencia, array $data): TransferenciaBem
    {
        return DB::transaction(function () use ($transferencia, $data): TransferenciaBem {
            $bem = $transferencia->bemPatrimonial()->lockForUpdate()->firstOrFail();
            $historicoRelacionado = $this->encontrarHistoricoDaTransferencia($transferencia);
            $payload = [
                ...$transferencia->only([
                    'bem_patrimonial_id',
                    'empresa_id',
                    'filial_id',
                    'origem_unidade_administrativa_id',
                    'origem_departamento_id',
                    'origem_local_id',
                    'origem_responsavel_id',
                    'destino_unidade_administrativa_id',
                    'destino_departamento_id',
                    'destino_local_id',
                    'destino_responsavel_id',
                    'data_transferencia',
                    'motivo',
                    'observacoes',
                ]),
                ...$data,
            ];
            $payload = $this->resolverResponsaveisDaTransferencia($bem, $payload);
            $this->assertOrigemAtual($bem, $payload);

            $transferencia->update($payload);

            if ($historicoRelacionado) {
                $historicoRelacionado->update([
                    'empresa_id' => $transferencia->empresa_id,
                    'filial_id' => $transferencia->filial_id,
                    'unidade_administrativa_id' => $transferencia->destino_unidade_administrativa_id,
                    'departamento_id' => $transferencia->destino_departamento_id,
                    'local_id' => $transferencia->destino_local_id,
                    'data_inicio' => $transferencia->data_transferencia,
                    'observacoes' => $this->montarObservacaoTransferencia($transferencia),
                ]);
            } else {
                $this->criarHistoricoDestino($transferencia);
            }

            $this->aplicarResponsavelDestinoNoBem($bem, $payload);
            $this->sincronizarLocalizacaoDoBem($bem->fresh());

            return $transferencia->fresh();
        });
    }

    public function removerTransferencia(TransferenciaBem $transferencia): void
    {
        DB::transaction(function () use ($transferencia): void {
            $bem = $transferencia->bemPatrimonial()->firstOrFail();
            $historicoRelacionado = $this->encontrarHistoricoDaTransferencia($transferencia);

            if ($historicoRelacionado) {
                $historicoRelacionado->delete();
            }

            $transferencia->delete();
            $this->sincronizarLocalizacaoDoBem($bem->fresh());
        });
    }

    public function registrarBaixa(array $data): BaixaBem
    {
        return DB::transaction(function () use ($data): BaixaBem {
            $bem = $this->obterBem($data['bem_patrimonial_id']);
            $this->assertBemContexto($bem, $data['empresa_id'], $data['filial_id']);

            $jaExisteBaixa = BaixaBem::query()
                ->where('bem_patrimonial_id', $bem->id)
                ->exists();

            if ($jaExisteBaixa) {
                throw ValidationException::withMessages([
                    'bem_patrimonial_id' => 'O bem informado ja possui baixa registrada.',
                ]);
            }

            $baixa = BaixaBem::query()->create($data);
            $bem->update(['status_bem' => 'baixado']);
            app(LogOperacaoPatrimonialService::class)->registrar(
                'BAIXA_BEM',
                $baixa,
                $baixa->empresa_id,
                ['status_bem' => 'ativo'],
                ['status_bem' => 'baixado'] + $baixa->toArray(),
            );

            return $baixa->fresh();
        });
    }

    public function atualizarBaixa(BaixaBem $baixa, array $data): BaixaBem
    {
        return DB::transaction(function () use ($baixa, $data): BaixaBem {
            $baixa->update($data);
            $baixa->bemPatrimonial()->firstOrFail()->update(['status_bem' => 'baixado']);

            return $baixa->fresh();
        });
    }

    public function removerBaixa(BaixaBem $baixa): void
    {
        DB::transaction(function () use ($baixa): void {
            $bem = $baixa->bemPatrimonial()->firstOrFail();

            $baixa->delete();

            $possuiOutraBaixa = BaixaBem::query()
                ->where('bem_patrimonial_id', $bem->id)
                ->exists();

            if (! $possuiOutraBaixa) {
                $bem->update(['status_bem' => 'ativo']);
            }
        });
    }

    public function registrarResponsabilidade(array $data): ResponsabilidadeBem
    {
        return DB::transaction(function () use ($data): ResponsabilidadeBem {
            $bem = $this->obterBem($data['bem_patrimonial_id']);
            $this->assertBemContexto($bem, $data['empresa_id'], $data['filial_id']);
            $this->validarSobreposicaoResponsabilidade($data);

            $responsabilidade = ResponsabilidadeBem::query()->create($data);
            $this->sincronizarResponsavelDoBem($bem->fresh());

            return $responsabilidade->fresh();
        });
    }

    public function atualizarResponsabilidade(ResponsabilidadeBem $responsabilidade, array $data): ResponsabilidadeBem
    {
        return DB::transaction(function () use ($responsabilidade, $data): ResponsabilidadeBem {
            $payload = [
                ...$responsabilidade->only([
                    'bem_patrimonial_id',
                    'empresa_id',
                    'filial_id',
                    'responsavel_id',
                    'data_inicio',
                    'data_fim',
                ]),
                ...$data,
            ];

            $this->validarSobreposicaoResponsabilidade($payload, $responsabilidade->id);
            $responsabilidade->update($data);
            $this->sincronizarResponsavelDoBem($responsabilidade->bemPatrimonial()->firstOrFail());

            return $responsabilidade->fresh();
        });
    }

    public function removerResponsabilidade(ResponsabilidadeBem $responsabilidade): void
    {
        DB::transaction(function () use ($responsabilidade): void {
            $bem = $responsabilidade->bemPatrimonial()->firstOrFail();

            $responsabilidade->delete();
            $this->sincronizarResponsavelDoBem($bem->fresh());
        });
    }

    public function sincronizarLocalizacaoDoBem(BemPatrimonial $bem): void
    {
        $historicoAtual = HistoricoLocalizacaoBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->orderByRaw('CASE WHEN data_fim IS NULL THEN 0 ELSE 1 END')
            ->orderByDesc('data_inicio')
            ->orderByDesc('id')
            ->first();

        if (! $historicoAtual) {
            return;
        }

        $bem->update([
            'filial_id' => $historicoAtual->filial_id,
            'unidade_administrativa_id' => $historicoAtual->unidade_administrativa_id,
            'departamento_id' => $historicoAtual->departamento_id,
            'local_id' => $historicoAtual->local_id,
        ]);
    }

    public function sincronizarResponsavelDoBem(BemPatrimonial $bem): void
    {
        $hoje = Carbon::today()->toDateString();

        $responsabilidadeAtual = ResponsabilidadeBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->where('data_inicio', '<=', $hoje)
            ->where(function ($query) use ($hoje): void {
                $query->whereNull('data_fim')
                    ->orWhere('data_fim', '>=', $hoje);
            })
            ->orderByDesc('data_inicio')
            ->orderByDesc('id')
            ->first();

        $bem->update([
            'responsavel_id' => $responsabilidadeAtual?->responsavel_id,
        ]);
    }

    protected function obterBem(int $bemPatrimonialId): BemPatrimonial
    {
        return BemPatrimonial::query()
            ->lockForUpdate()
            ->findOrFail($bemPatrimonialId);
    }

    protected function assertBemContexto(BemPatrimonial $bem, int $empresaId, int $filialId): void
    {
        if ($bem->empresa_id !== $empresaId || $bem->filial_id !== $filialId) {
            throw ValidationException::withMessages([
                'bem_patrimonial_id' => 'O bem informado nao pertence ao contexto de empresa e filial enviado.',
            ]);
        }
    }

    protected function assertBemNaoBaixado(BemPatrimonial $bem): void
    {
        if ($bem->status_bem === 'baixado') {
            throw ValidationException::withMessages([
                'bem_patrimonial_id' => 'Nao e permitido transferir um bem com status baixado.',
            ]);
        }
    }

    protected function assertOrigemAtual(BemPatrimonial $bem, array $data): void
    {
        $origemInalterada = $bem->unidade_administrativa_id === $data['origem_unidade_administrativa_id']
            && $bem->departamento_id === $data['origem_departamento_id']
            && $bem->local_id === $data['origem_local_id'];

        if (! $origemInalterada) {
            throw ValidationException::withMessages([
                'origem_local_id' => 'A origem informada nao corresponde a localizacao atual do bem.',
            ]);
        }

        $destinoDiferente = $data['origem_unidade_administrativa_id'] !== $data['destino_unidade_administrativa_id']
            || $data['origem_departamento_id'] !== $data['destino_departamento_id']
            || $data['origem_local_id'] !== $data['destino_local_id'];

        if (! $destinoDiferente) {
            throw ValidationException::withMessages([
                'destino_local_id' => 'Origem e destino da transferencia nao podem ser iguais.',
            ]);
        }

        if (isset($data['origem_responsavel_id']) && $data['origem_responsavel_id'] !== null) {
            if ((int) $data['origem_responsavel_id'] !== (int) ($bem->responsavel_id ?? 0)) {
                throw ValidationException::withMessages([
                    'origem_responsavel_id' => 'O responsavel de origem deve corresponder ao responsavel atual do bem.',
                ]);
            }
        }
    }

    protected function encerrarHistoricoAtual(BemPatrimonial $bem, string $dataReferencia): void
    {
        $historicoAtual = HistoricoLocalizacaoBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->whereNull('data_fim')
            ->orderByDesc('data_inicio')
            ->orderByDesc('id')
            ->first();

        if (! $historicoAtual) {
            return;
        }

        if ($historicoAtual->data_inicio?->toDateString() > $dataReferencia) {
            throw ValidationException::withMessages([
                'data_transferencia' => 'A data da transferencia nao pode ser anterior ao inicio da localizacao atual.',
            ]);
        }

        $historicoAtual->update([
            'data_fim' => $dataReferencia,
        ]);
    }

    protected function criarHistoricoDestino(TransferenciaBem $transferencia): HistoricoLocalizacaoBem
    {
        return HistoricoLocalizacaoBem::query()->create([
            'bem_patrimonial_id' => $transferencia->bem_patrimonial_id,
            'empresa_id' => $transferencia->empresa_id,
            'filial_id' => $transferencia->filial_id,
            'unidade_administrativa_id' => $transferencia->destino_unidade_administrativa_id,
            'departamento_id' => $transferencia->destino_departamento_id,
            'local_id' => $transferencia->destino_local_id,
            'data_inicio' => $transferencia->data_transferencia,
            'observacoes' => $this->montarObservacaoTransferencia($transferencia),
        ]);
    }

    protected function encontrarHistoricoDaTransferencia(TransferenciaBem $transferencia): ?HistoricoLocalizacaoBem
    {
        return HistoricoLocalizacaoBem::query()
            ->where('bem_patrimonial_id', $transferencia->bem_patrimonial_id)
            ->where('empresa_id', $transferencia->empresa_id)
            ->where('filial_id', $transferencia->filial_id)
            ->where('unidade_administrativa_id', $transferencia->destino_unidade_administrativa_id)
            ->where('departamento_id', $transferencia->destino_departamento_id)
            ->where('local_id', $transferencia->destino_local_id)
            ->whereDate('data_inicio', $transferencia->data_transferencia)
            ->orderByDesc('id')
            ->first();
    }

    protected function montarObservacaoTransferencia(TransferenciaBem $transferencia): string
    {
        $observacoes = trim((string) $transferencia->observacoes);
        $base = 'Transferencia patrimonial: '.$transferencia->motivo;

        return $observacoes !== ''
            ? $base.' - '.$observacoes
            : $base;
    }

    protected function validarSobreposicaoResponsabilidade(array $data, ?int $ignorarId = null): void
    {
        $dataInicio = Carbon::parse($data['data_inicio'])->toDateString();
        $dataFim = isset($data['data_fim']) && $data['data_fim'] !== null
            ? Carbon::parse($data['data_fim'])->toDateString()
            : null;

        $query = ResponsabilidadeBem::query()
            ->where('bem_patrimonial_id', $data['bem_patrimonial_id']);

        if ($ignorarId !== null) {
            $query->where('id', '!=', $ignorarId);
        }

        $query->where(function ($query) use ($dataInicio, $dataFim): void {
            if ($dataFim !== null) {
                $query->where('data_inicio', '<=', $dataFim);
            }

            if ($dataFim === null) {
                $query->where(function ($query) use ($dataInicio): void {
                    $query->whereNull('data_fim')
                        ->orWhere('data_fim', '>=', $dataInicio);
                });

                return;
            }

            $query->where(function ($query) use ($dataInicio): void {
                $query->whereNull('data_fim')
                    ->orWhere('data_fim', '>=', $dataInicio);
            });
        });

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'data_inicio' => 'Ja existe responsabilidade em periodo conflitante para este bem.',
            ]);
        }
    }

    protected function resolverResponsaveisDaTransferencia(BemPatrimonial $bem, array $data): array
    {
        $origemResponsavelId = array_key_exists('origem_responsavel_id', $data)
            ? $data['origem_responsavel_id']
            : $bem->responsavel_id;

        $data['origem_responsavel_id'] = $origemResponsavelId !== null
            ? (int) $origemResponsavelId
            : null;

        if ($data['origem_responsavel_id'] !== null) {
            $this->assertResponsavelContexto(
                $data['origem_responsavel_id'],
                (int) $data['empresa_id'],
                (int) $data['filial_id'],
                (int) $data['origem_departamento_id'],
                'origem_responsavel_id',
            );
        }

        $destinoResponsavelId = $data['destino_responsavel_id'] ?? null;
        $data['destino_responsavel_id'] = $destinoResponsavelId !== null && $destinoResponsavelId !== ''
            ? (int) $destinoResponsavelId
            : null;

        if ($data['destino_responsavel_id'] !== null) {
            $this->assertResponsavelContexto(
                $data['destino_responsavel_id'],
                (int) $data['empresa_id'],
                (int) $data['filial_id'],
                (int) $data['destino_departamento_id'],
                'destino_responsavel_id',
            );
        }

        return $data;
    }

    protected function assertResponsavelContexto(
        int $responsavelId,
        int $empresaId,
        int $filialId,
        int $departamentoId,
        string $field,
    ): void {
        $existeNoContexto = Responsavel::query()
            ->where('id', $responsavelId)
            ->where('empresa_id', $empresaId)
            ->where('filial_id', $filialId)
            ->where('departamento_id', $departamentoId)
            ->exists();

        if (! $existeNoContexto) {
            throw ValidationException::withMessages([
                $field => 'O responsavel informado nao pertence ao contexto da transferencia.',
            ]);
        }
    }

    protected function aplicarResponsavelDestinoNoBem(BemPatrimonial $bem, array $data): void
    {
        $atualizar = filter_var($data['atualizar_responsavel_bem'] ?? false, FILTER_VALIDATE_BOOL);

        if (! $atualizar || ! array_key_exists('destino_responsavel_id', $data)) {
            return;
        }

        $bem->update([
            'responsavel_id' => $data['destino_responsavel_id'],
        ]);
    }
}
