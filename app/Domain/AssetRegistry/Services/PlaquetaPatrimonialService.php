<?php

namespace App\Domain\AssetRegistry\Services;

use App\Domain\AssetRegistry\Enums\PlaquetaStatusEnum;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\AssetRegistry\Models\PlaquetaPatrimonial;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaquetaPatrimonialService
{
    public function gerarNumeroPlaqueta(int $empresaId): string
    {
        $ultimoNumero = PlaquetaPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->selectRaw("MAX(CAST(regexp_replace(numero_plaqueta, '[^0-9]', '', 'g') AS INTEGER)) AS ultimo_numero")
            ->value('ultimo_numero');

        return str_pad((string) (((int) $ultimoNumero) + 1), 4, '0', STR_PAD_LEFT);
    }

    public function gerarCodigoPlaqueta(int $empresaId): string
    {
        do {
            $numeroPlaqueta = $this->gerarNumeroPlaqueta($empresaId);
            $codigo = sprintf('PAT-%d-%s', $empresaId, $numeroPlaqueta);
        } while (PlaquetaPatrimonial::query()
            ->where('empresa_id', $empresaId)
            ->where('codigo_plaqueta', $codigo)
            ->exists());

        return $codigo;
    }

    public function gerarCodigoBarrasConteudo(BemPatrimonial $bem, string $numeroPlaqueta): string
    {
        return sprintf('PAT-%d-%s', $bem->empresa_id, $numeroPlaqueta);
    }

    public function gerarLinkConsulta(string $codigoBarrasConteudo): string
    {
        return sprintf(
            '%s/patrimonio/consulta?codigo=%s',
            rtrim(config('app.frontend_url', env('FRONTEND_PUBLIC_URL', 'http://localhost:5001')), '/'),
            urlencode($codigoBarrasConteudo),
        );
    }

    public function gerarQrCodeConteudo(BemPatrimonial $bem, string $codigoPlaqueta): string
    {
        return $this->gerarLinkConsulta($codigoPlaqueta);
    }

    public function criarPlaquetaParaBem(array $data): PlaquetaPatrimonial
    {
        return DB::transaction(function () use ($data): PlaquetaPatrimonial {
            $bem = BemPatrimonial::query()
                ->lockForUpdate()
                ->findOrFail($data['bem_patrimonial_id']);

            $this->assertBemContexto($bem, (int) $data['empresa_id'], (int) $data['filial_id']);

            $numeroPlaqueta = (string) ($data['numero_plaqueta'] ?? $this->gerarNumeroPlaqueta((int) $data['empresa_id']));
            $codigoPlaqueta = (string) ($data['codigo_plaqueta'] ?? $numeroPlaqueta);
            $codigoBarrasConteudo = $this->gerarCodigoBarrasConteudo($bem, $numeroPlaqueta);
            $linkConsulta = $this->gerarLinkConsulta($codigoBarrasConteudo);
            $status = PlaquetaStatusEnum::from($data['status'] ?? PlaquetaStatusEnum::VINCULADA->value);
            $dataGeracao = Carbon::parse($data['data_geracao'] ?? now())->toDateString();

            if ($status->isAtiva()) {
                $this->inativarPlaquetaAnteriorSeNecessario($bem->id);
            }

            return PlaquetaPatrimonial::query()->create([
                'bem_patrimonial_id' => $bem->id,
                'empresa_id' => $bem->empresa_id,
                'filial_id' => $bem->filial_id,
                'codigo_plaqueta' => $codigoPlaqueta,
                'numero_plaqueta' => $numeroPlaqueta,
                'codigo_barras_conteudo' => $codigoBarrasConteudo,
                'link_consulta' => $linkConsulta,
                'qr_code_conteudo' => $this->gerarQrCodeConteudo($bem, $codigoBarrasConteudo),
                'status' => $status->value,
                'data_geracao' => $dataGeracao,
                'data_aplicacao' => $data['data_aplicacao'] ?? null,
                'observacoes' => $data['observacoes'] ?? null,
            ]);
        });
    }

    public function criarOuAtualizarPlaquetaEmEstoque(array $data): PlaquetaPatrimonial
    {
        return DB::transaction(function () use ($data): PlaquetaPatrimonial {
            $empresaId = (int) $data['empresa_id'];
            $numeroPlaqueta = trim((string) $data['numero_plaqueta']);
            $codigoBarrasConteudo = trim((string) $data['codigo_barras_conteudo']);
            $codigoPlaqueta = (string) ($data['codigo_plaqueta'] ?? $numeroPlaqueta);

            $plaqueta = PlaquetaPatrimonial::query()
                ->where('empresa_id', $empresaId)
                ->where(function ($query) use ($numeroPlaqueta, $codigoBarrasConteudo): void {
                    $query->where('numero_plaqueta', $numeroPlaqueta)
                        ->orWhere('codigo_barras_conteudo', $codigoBarrasConteudo);
                })
                ->lockForUpdate()
                ->first();

            if ($plaqueta instanceof PlaquetaPatrimonial) {
                $plaqueta->update([
                    'codigo_plaqueta' => $codigoPlaqueta,
                    'numero_plaqueta' => $numeroPlaqueta,
                    'codigo_barras_conteudo' => $codigoBarrasConteudo,
                    'link_consulta' => $this->gerarLinkConsulta($codigoBarrasConteudo),
                    'qr_code_conteudo' => $this->gerarLinkConsulta($codigoBarrasConteudo),
                    'status' => $plaqueta->bem_patrimonial_id ? $plaqueta->status->value : PlaquetaStatusEnum::EM_ESTOQUE->value,
                    'data_geracao' => Carbon::parse($data['data_geracao'] ?? now())->toDateString(),
                    'observacoes' => $data['observacoes'] ?? $plaqueta->observacoes,
                ]);

                return $plaqueta->fresh();
            }

            return PlaquetaPatrimonial::query()->create([
                'empresa_id' => $empresaId,
                'filial_id' => $data['filial_id'] ?? null,
                'bem_patrimonial_id' => null,
                'codigo_plaqueta' => $codigoPlaqueta,
                'numero_plaqueta' => $numeroPlaqueta,
                'codigo_barras_conteudo' => $codigoBarrasConteudo,
                'link_consulta' => $this->gerarLinkConsulta($codigoBarrasConteudo),
                'qr_code_conteudo' => $this->gerarLinkConsulta($codigoBarrasConteudo),
                'status' => PlaquetaStatusEnum::EM_ESTOQUE->value,
                'data_geracao' => Carbon::parse($data['data_geracao'] ?? now())->toDateString(),
                'data_aplicacao' => null,
                'observacoes' => $data['observacoes'] ?? null,
            ]);
        });
    }

    public function vincularPlaquetaExistente(array $data): PlaquetaPatrimonial
    {
        return DB::transaction(function () use ($data): PlaquetaPatrimonial {
            $empresaId = (int) $data['empresa_id'];
            $bem = BemPatrimonial::query()
                ->lockForUpdate()
                ->findOrFail((int) $data['bem_patrimonial_id']);

            if ((int) $bem->empresa_id !== $empresaId) {
                throw ValidationException::withMessages([
                    'bem_patrimonial_id' => 'O bem selecionado não pertence à empresa ativa.',
                ]);
            }

            $plaqueta = null;

            if (! empty($data['plaqueta_id'])) {
                $plaqueta = PlaquetaPatrimonial::query()
                    ->where('empresa_id', $empresaId)
                    ->lockForUpdate()
                    ->findOrFail((int) $data['plaqueta_id']);
            } elseif (! empty($data['codigo_barras_conteudo'])) {
                $plaqueta = PlaquetaPatrimonial::query()
                    ->where('empresa_id', $empresaId)
                    ->where('codigo_barras_conteudo', trim((string) $data['codigo_barras_conteudo']))
                    ->lockForUpdate()
                    ->first();
            }

            if (! $plaqueta instanceof PlaquetaPatrimonial) {
                throw ValidationException::withMessages([
                    'codigo_barras_conteudo' => 'A plaqueta informada não foi encontrada nesta empresa.',
                ]);
            }

            if ($plaqueta->bem_patrimonial_id !== null && (int) $plaqueta->bem_patrimonial_id !== (int) $bem->id) {
                throw ValidationException::withMessages([
                    'plaqueta_id' => 'Esta plaqueta já está vinculada a outro bem patrimonial.',
                ]);
            }

            $this->inativarPlaquetaAnteriorSeNecessario($bem->id, $plaqueta->id);

            $plaqueta->update([
                'bem_patrimonial_id' => $bem->id,
                'filial_id' => $bem->filial_id,
                'codigo_plaqueta' => $plaqueta->codigo_plaqueta ?: $plaqueta->numero_plaqueta,
                'status' => PlaquetaStatusEnum::VINCULADA->value,
                'data_aplicacao' => Carbon::now()->toDateString(),
                'link_consulta' => $this->gerarLinkConsulta($plaqueta->codigo_barras_conteudo),
                'qr_code_conteudo' => $this->gerarLinkConsulta($plaqueta->codigo_barras_conteudo),
            ]);

            return $plaqueta->fresh();
        });
    }

    public function atualizarPlaqueta(PlaquetaPatrimonial $plaqueta, array $data): PlaquetaPatrimonial
    {
        return DB::transaction(function () use ($plaqueta, $data): PlaquetaPatrimonial {
            $payload = [
                ...$plaqueta->only([
                    'bem_patrimonial_id',
                    'empresa_id',
                    'filial_id',
                    'codigo_plaqueta',
                    'numero_plaqueta',
                    'status',
                    'data_geracao',
                    'data_aplicacao',
                    'observacoes',
                ]),
                ...$data,
            ];

            $bem = BemPatrimonial::query()
                ->lockForUpdate()
                ->findOrFail($payload['bem_patrimonial_id']);

            $this->assertBemContexto($bem, (int) $payload['empresa_id'], (int) $payload['filial_id']);

            $status = PlaquetaStatusEnum::from((string) $payload['status']);

            if ($status->isAtiva() && $bem->id) {
                $this->inativarPlaquetaAnteriorSeNecessario($bem->id, $plaqueta->id);
            }

            $numeroPlaqueta = (string) ($payload['numero_plaqueta'] ?? $plaqueta->numero_plaqueta);
            $codigoPlaqueta = (string) ($payload['codigo_plaqueta'] ?? $payload['numero_plaqueta'] ?? $plaqueta->codigo_plaqueta);
            $codigoBarrasConteudo = $this->gerarCodigoBarrasConteudo($bem, $numeroPlaqueta);
            $linkConsulta = $this->gerarLinkConsulta($codigoBarrasConteudo);

            $plaqueta->update([
                'bem_patrimonial_id' => $bem->id,
                'empresa_id' => $bem->empresa_id,
                'filial_id' => $bem->filial_id,
                'codigo_plaqueta' => $codigoPlaqueta,
                'numero_plaqueta' => $numeroPlaqueta,
                'codigo_barras_conteudo' => $codigoBarrasConteudo,
                'link_consulta' => $linkConsulta,
                'qr_code_conteudo' => $this->gerarQrCodeConteudo($bem, $codigoBarrasConteudo),
                'status' => $status->value,
                'data_geracao' => Carbon::parse($payload['data_geracao'])->toDateString(),
                'data_aplicacao' => isset($payload['data_aplicacao']) && $payload['data_aplicacao'] !== null
                    ? Carbon::parse($payload['data_aplicacao'])->toDateString()
                    : null,
                'observacoes' => $payload['observacoes'] ?? null,
            ]);

            return $plaqueta->fresh();
        });
    }

    public function inativarPlaquetaAnteriorSeNecessario(int $bemPatrimonialId, ?int $ignorePlaquetaId = null): void
    {
        $query = PlaquetaPatrimonial::query()
            ->where('bem_patrimonial_id', $bemPatrimonialId)
            ->whereIn('status', [PlaquetaStatusEnum::GERADA->value, PlaquetaStatusEnum::APLICADA->value]);

        if ($ignorePlaquetaId !== null) {
            $query->where('id', '!=', $ignorePlaquetaId);
        }

        $query->get()->each(function (PlaquetaPatrimonial $plaqueta): void {
            $novoStatus = $plaqueta->status === PlaquetaStatusEnum::APLICADA
                ? PlaquetaStatusEnum::SUBSTITUIDA
                : PlaquetaStatusEnum::INATIVA;

            $plaqueta->update([
                'status' => $novoStatus->value,
            ]);
        });
    }

    protected function assertBemContexto(BemPatrimonial $bem, int $empresaId, int $filialId): void
    {
        if ($bem->empresa_id !== $empresaId || $bem->filial_id !== $filialId) {
            throw ValidationException::withMessages([
                'bem_patrimonial_id' => 'O bem informado não pertence ao contexto de empresa e filial enviado.',
            ]);
        }
    }

    public function localizarPorCodigo(string $codigo): ?PlaquetaPatrimonial
    {
        $codigoNormalizado = trim($codigo);
        $codigoNormalizado = preg_replace('/\s+/', '', $codigoNormalizado) ?? $codigoNormalizado;

        if ($codigoNormalizado === '') {
            return null;
        }

        if (filter_var($codigoNormalizado, FILTER_VALIDATE_URL)) {
            $parsedUrl = parse_url($codigoNormalizado);
            $query = [];
            parse_str($parsedUrl['query'] ?? '', $query);
            $codigoNormalizado = (string) ($query['codigo'] ?? basename((string) ($parsedUrl['path'] ?? '')));
        }

        return PlaquetaPatrimonial::query()
            ->with([
                'bemPatrimonial.local',
                'bemPatrimonial.responsavel',
                'bemPatrimonial.filial',
                'bemPatrimonial.empresa',
            ])
            ->where('codigo_plaqueta', $codigoNormalizado)
            ->orWhere('numero_plaqueta', $codigoNormalizado)
            ->orWhere('codigo_barras_conteudo', $codigoNormalizado)
            ->orWhere('qr_code_conteudo', $codigoNormalizado)
            ->orWhere('link_consulta', $codigoNormalizado)
            ->first();
    }
}
