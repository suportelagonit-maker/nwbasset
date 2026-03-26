<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\Audit\Services\LogOperacaoPatrimonialService;
use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Models\DepreciacaoBem;
use App\Domain\Depreciation\Models\MetodoDepreciacao;
use App\Domain\Depreciation\Models\ParametroDepreciacao;
use App\Domain\Depreciation\Models\RegraDepreciacaoTipoBem;
use App\Domain\Depreciation\Models\TipoBemPatrimonial;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DepreciacaoService
{
    private const PRESETS_TIPO_BEM = [
        'informatica' => [
            'nome' => 'Informatica',
            'vida_util_anos' => 5,
            'valor_residual_percentual' => 0.0,
        ],
        'equipamentos' => [
            'nome' => 'Equipamentos',
            'vida_util_anos' => 10,
            'valor_residual_percentual' => 0.0,
        ],
        'mobiliario' => [
            'nome' => 'Mobiliario',
            'vida_util_anos' => 10,
            'valor_residual_percentual' => 0.0,
        ],
        'veiculos' => [
            'nome' => 'Veiculos',
            'vida_util_anos' => 5,
            'valor_residual_percentual' => 0.0,
        ],
        'imoveis' => [
            'nome' => 'Imoveis',
            'vida_util_anos' => 25,
            'valor_residual_percentual' => 0.0,
        ],
        'utensilios' => [
            'nome' => 'Utensilios',
            'vida_util_anos' => 10,
            'valor_residual_percentual' => 0.0,
        ],
        'terrenos' => [
            'nome' => 'Terrenos',
            'vida_util_anos' => 1,
            'valor_residual_percentual' => 0.0,
            'depreciavel' => false,
        ],
        'edificacoes' => [
            'nome' => 'Edificacoes',
            'vida_util_anos' => 25,
            'valor_residual_percentual' => 0.0,
            'depreciavel' => true,
        ],
    ];

    public function __construct(
        private readonly RegraDepreciacaoEfetivaResolverService $regraEfetivaResolverService,
    ) {
    }

    public function aplicarDepreciacaoAutomaticaPorEmpresa(
        int $empresaId,
        ?int $metodoDepreciacaoId = null,
        ?string $dataCalculo = null
    ): array {
        return DB::transaction(function () use ($empresaId, $metodoDepreciacaoId, $dataCalculo): array {
            $metodoForcado = $metodoDepreciacaoId !== null
                ? $this->resolverMetodoDepreciacao($metodoDepreciacaoId)
                : null;
            $dataReferencia = Carbon::parse($dataCalculo ?? now())->toDateString();

            $bens = BemPatrimonial::query()
                ->where('empresa_id', $empresaId)
                ->get();

            $criados = 0;
            $atualizados = 0;

            foreach ($bens as $bem) {
                $regraEfetiva = $this->regraEfetivaResolverService->resolverRegraEfetivaParaBem($bem);

                if (! (bool) ($regraEfetiva['depreciavel'] ?? true)) {
                    continue;
                }

                $metodo = $metodoForcado ?? $this->resolverMetodoDepreciacao(null, $bem, $regraEfetiva);
                $payload = $this->montarPayloadDepreciacao($bem, $metodo, [
                    'empresa_id' => $empresaId,
                    'data_calculo' => $dataReferencia,
                    'metodo_depreciacao_id' => $metodo->id,
                ]);

                $depreciacao = DepreciacaoBem::query()
                    ->where('bem_patrimonial_id', $bem->id)
                    ->whereDate('data_calculo', $dataReferencia)
                    ->first();

                if ($depreciacao) {
                    $depreciacao->update($payload);
                    $atualizados++;
                    continue;
                }

                $novaDepreciacao = DepreciacaoBem::query()->create($payload);
                $criados++;

                app(LogOperacaoPatrimonialService::class)->registrar(
                    'DEPRECIACAO_BEM',
                    $novaDepreciacao,
                    $novaDepreciacao->empresa_id,
                    [],
                    $novaDepreciacao->toArray(),
                );
            }

            return [
                'empresa_id' => $empresaId,
                'metodo_depreciacao_id' => $metodoForcado?->id,
                'data_calculo' => $dataReferencia,
                'bens_processados' => $bens->count(),
                'depreciacoes_criadas' => $criados,
                'depreciacoes_atualizadas' => $atualizados,
            ];
        });
    }

    public function calcularDepreciacaoAnual(float $valorAquisicao, float $valorResidual, int $vidaUtilAnos): float
    {
        $this->validarVidaUtil($vidaUtilAnos);

        $valorDepreciavel = max(0, $valorAquisicao - $valorResidual);

        return round($valorDepreciavel / $vidaUtilAnos, 2);
    }

    public function calcularValorContabil(float $valorAquisicao, float $valorDepreciadoAcumulado): float
    {
        return round(max(0, $valorAquisicao - $valorDepreciadoAcumulado), 2);
    }

    public function registrarDepreciacao(array $data): DepreciacaoBem
    {
        return DB::transaction(function () use ($data): DepreciacaoBem {
            $bem = BemPatrimonial::query()->findOrFail($data['bem_patrimonial_id']);
            $metodo = $this->resolverMetodoDepreciacao($data['metodo_depreciacao_id'] ?? null, $bem);

            $payload = $this->montarPayloadDepreciacao($bem, $metodo, $data);

            $existe = DepreciacaoBem::query()
                ->where('bem_patrimonial_id', $payload['bem_patrimonial_id'])
                ->whereDate('data_calculo', $payload['data_calculo'])
                ->exists();

            if ($existe) {
                throw ValidationException::withMessages([
                    'data_calculo' => 'Ja existe depreciacao registrada para o bem na data informada.',
                ]);
            }

            $depreciacao = DepreciacaoBem::query()->create($payload);

            app(LogOperacaoPatrimonialService::class)->registrar(
                'DEPRECIACAO_BEM',
                $depreciacao,
                $depreciacao->empresa_id,
                [],
                $depreciacao->toArray(),
            );

            return $depreciacao;
        });
    }

    public function atualizarDepreciacao(DepreciacaoBem $depreciacao, array $data): DepreciacaoBem
    {
        return DB::transaction(function () use ($depreciacao, $data): DepreciacaoBem {
            $bem = BemPatrimonial::query()->findOrFail($data['bem_patrimonial_id'] ?? $depreciacao->bem_patrimonial_id);
            $metodo = $this->resolverMetodoDepreciacao(
                $data['metodo_depreciacao_id'] ?? $depreciacao->metodo_depreciacao_id,
                $bem,
            );

            $payload = $this->montarPayloadDepreciacao($bem, $metodo, [
                'empresa_id' => $data['empresa_id'] ?? $depreciacao->empresa_id,
                'valor_aquisicao' => $data['valor_aquisicao'] ?? $depreciacao->valor_aquisicao,
                'valor_residual' => $data['valor_residual'] ?? $depreciacao->valor_residual,
                'vida_util_anos' => $data['vida_util_anos'] ?? $depreciacao->vida_util_anos,
                'data_calculo' => $data['data_calculo'] ?? $depreciacao->data_calculo?->toDateString(),
                'metodo_depreciacao_id' => $metodo->id,
                'bem_patrimonial_id' => $bem->id,
            ]);

            $existe = DepreciacaoBem::query()
                ->where('bem_patrimonial_id', $payload['bem_patrimonial_id'])
                ->whereDate('data_calculo', $payload['data_calculo'])
                ->where('id', '!=', $depreciacao->id)
                ->exists();

            if ($existe) {
                throw ValidationException::withMessages([
                    'data_calculo' => 'Ja existe depreciacao registrada para o bem na data informada.',
                ]);
            }

            $depreciacao->update($payload);

            return $depreciacao->fresh();
        });
    }

    protected function montarPayloadDepreciacao(BemPatrimonial $bem, MetodoDepreciacao $metodo, array $data): array
    {
        $empresaId = (int) ($data['empresa_id'] ?? $bem->empresa_id);

        if ($empresaId !== (int) $bem->empresa_id) {
            throw ValidationException::withMessages([
                'empresa_id' => 'O bem informado nao pertence a empresa enviada.',
            ]);
        }

        $dataCalculo = Carbon::parse($data['data_calculo'] ?? now())->toDateString();
        $baseRegra = trim((string) ($data['base_regra'] ?? 'fiscal'));
        $regraEfetiva = $this->regraEfetivaResolverService->resolverRegraEfetivaParaBem(
            $bem,
            $baseRegra,
            $dataCalculo,
        );

        if (! (bool) ($regraEfetiva['depreciavel'] ?? true)) {
            throw ValidationException::withMessages([
                'bem_patrimonial_id' => 'O bem informado esta marcado como nao depreciavel para a regra vigente.',
            ]);
        }

        $valorAquisicao = (float) ($data['valor_aquisicao'] ?? $bem->valor_aquisicao ?? 0);
        $valorResidualFonte = array_key_exists('valor_residual', $data)
            ? $data['valor_residual']
            : $bem->valor_residual;
        $valorResidualPercentual = (float) ($regraEfetiva['valor_residual_percentual'] ?? 0);
        $valorResidualMonetario = $regraEfetiva['valor_residual_monetario'] ?? null;

        if (($valorResidualFonte === null || (float) $valorResidualFonte <= 0) && $valorResidualMonetario !== null) {
            $valorResidualFonte = (float) $valorResidualMonetario;
        }

        if (($valorResidualFonte === null || (float) $valorResidualFonte <= 0) && $valorResidualPercentual > 0) {
            $valorResidualFonte = ($valorAquisicao * $valorResidualPercentual) / 100;
        }

        $valorResidual = (float) ($valorResidualFonte ?? 0);
        $vidaUtilAnos = (int) ($data['vida_util_anos']
            ?? $regraEfetiva['vida_util_anos']
            ?? $bem->vida_util_anos
            ?? $this->resolverVidaUtilPadrao($empresaId, $metodo->id));

        $this->validarVidaUtil($vidaUtilAnos);

        if ($bem->data_aquisicao && Carbon::parse($dataCalculo)->lt($bem->data_aquisicao)) {
            throw ValidationException::withMessages([
                'data_calculo' => 'A data de calculo nao pode ser anterior a data de aquisicao do bem.',
            ]);
        }

        $taxaAnual = round((float) ($data['taxa_anual']
            ?? $data['taxa_anual_percentual']
            ?? $regraEfetiva['taxa_anual_percentual']
            ?? (100 / $vidaUtilAnos)), 4);
        $valorDepreciavel = max(0, round($valorAquisicao - $valorResidual, 2));
        $depreciacaoAnual = round(($valorDepreciavel * $taxaAnual) / 100, 2);
        $anosDepreciados = $this->calcularAnosDepreciados($bem, $dataCalculo, $vidaUtilAnos);
        $valorDepreciadoAcumulado = min($valorDepreciavel, round($depreciacaoAnual * $anosDepreciados, 2));
        $valorContabil = max(round($valorResidual, 2), $this->calcularValorContabil($valorAquisicao, $valorDepreciadoAcumulado));

        return [
            'bem_patrimonial_id' => $bem->id,
            'empresa_id' => $empresaId,
            'metodo_depreciacao_id' => $metodo->id,
            'valor_aquisicao' => round($valorAquisicao, 2),
            'valor_residual' => round($valorResidual, 2),
            'vida_util_anos' => $vidaUtilAnos,
            'taxa_anual' => $taxaAnual,
            'valor_depreciado_acumulado' => $valorDepreciadoAcumulado,
            'valor_contabil' => $valorContabil,
            'data_calculo' => $dataCalculo,
        ];
    }

    public function obterRegraPadraoPorTipoBem(int $empresaId, ?string $tipoBem): ?RegraDepreciacaoTipoBem
    {
        return $this->obterOuCriarRegraPadraoPorTipoBem($empresaId, $tipoBem);
    }

    public function herdarRegraDepreciacaoParaBem(BemPatrimonial $bem, ?int $usuarioId = null): void
    {
        $this->regraEfetivaResolverService->herdarRegraPadraoParaBem($bem, 'fiscal', $usuarioId);
    }

    protected function resolverMetodoDepreciacao(
        ?int $metodoDepreciacaoId,
        ?BemPatrimonial $bem = null,
        ?array $regraEfetiva = null
    ): MetodoDepreciacao
    {
        if ($metodoDepreciacaoId !== null) {
            return MetodoDepreciacao::query()->findOrFail($metodoDepreciacaoId);
        }

        if ($regraEfetiva && ! empty($regraEfetiva['metodo_depreciacao_id'])) {
            $metodo = MetodoDepreciacao::query()->find((int) $regraEfetiva['metodo_depreciacao_id']);

            if ($metodo) {
                return $metodo;
            }
        }

        if ($bem) {
            $regraEfetiva = $regraEfetiva ?: $this->regraEfetivaResolverService->resolverRegraEfetivaParaBem($bem);

            if (! empty($regraEfetiva['metodo_depreciacao_id'])) {
                $metodo = MetodoDepreciacao::query()->find((int) $regraEfetiva['metodo_depreciacao_id']);
                if ($metodo) {
                    return $metodo;
                }
            }
        }

        return MetodoDepreciacao::query()
            ->where('codigo', 'LINHA_RETA')
            ->firstOrFail();
    }

    protected function resolverVidaUtilPadrao(int $empresaId, int $metodoDepreciacaoId): int
    {
        $parametro = ParametroDepreciacao::query()
            ->where('empresa_id', $empresaId)
            ->where('metodo_depreciacao_id', $metodoDepreciacaoId)
            ->first();

        if (! $parametro) {
            throw ValidationException::withMessages([
                'vida_util_anos' => 'Vida util nao informada e nenhum parametro padrao foi encontrado para a empresa.',
            ]);
        }

        return (int) $parametro->vida_util_padrao;
    }

    protected function resolverRegraPorTipoBem(int $empresaId, ?string $tipoBem): ?RegraDepreciacaoTipoBem
    {
        $tipoBemNormalizado = trim((string) $tipoBem);

        if ($tipoBemNormalizado === '') {
            return null;
        }

        $query = RegraDepreciacaoTipoBem::query()
            ->with('metodoDepreciacao')
            ->where('empresa_id', $empresaId)
            ->whereRaw('LOWER(tipo_bem) = ?', [mb_strtolower($tipoBemNormalizado)]);

        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'base_regra')) {
            $query->where('base_regra', 'fiscal');
        }
        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'ativo')) {
            $query->where('ativo', true);
        }
        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'data_inicio_vigencia')) {
            $query->whereDate('data_inicio_vigencia', '<=', now()->toDateString())
                ->orderByDesc('data_inicio_vigencia');
        }
        if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'data_fim_vigencia')) {
            $query->where(function ($scope): void {
                $scope->whereNull('data_fim_vigencia')
                    ->orWhereDate('data_fim_vigencia', '>=', now()->toDateString());
            });
        }

        return $query->orderByDesc('id')->first();
    }

    public function obterOuCriarRegraPadraoPorTipoBem(int $empresaId, ?string $tipoBem): ?RegraDepreciacaoTipoBem
    {
        $tipoBemNormalizado = trim((string) $tipoBem);

        if ($tipoBemNormalizado === '') {
            return null;
        }

        $regraExistente = $this->resolverRegraPorTipoBem($empresaId, $tipoBemNormalizado);

        if ($regraExistente) {
            return $regraExistente;
        }

        $preset = $this->obterPresetPadraoPorTipoBem($tipoBemNormalizado);

        if (! $preset) {
            return null;
        }

        $metodoLinhaReta = MetodoDepreciacao::query()
            ->where('codigo', 'LINHA_RETA')
            ->first();

        if (! $metodoLinhaReta) {
            return null;
        }

        try {
            $depreciavel = ! str_contains($this->normalizarTipoBem($preset['nome_exibicao']), 'terreno');
            $taxaPadrao = $depreciavel ? round(100 / $preset['vida_util_anos'], 4) : 0.0;

            $tipoBemModel = null;
            if (Schema::hasTable('tipos_bens_patrimoniais')) {
                $tipoBemModel = TipoBemPatrimonial::query()->firstOrCreate(
                    [
                        'empresa_id' => $empresaId,
                        'nome' => $preset['nome_exibicao'],
                    ],
                );
            }

            $dadosRegra = [
                'empresa_id' => $empresaId,
                'tipo_bem' => $preset['nome_exibicao'],
                'metodo_depreciacao_id' => $metodoLinhaReta->id,
                'vida_util_anos' => $preset['vida_util_anos'],
                'taxa_anual' => $taxaPadrao,
                'valor_residual_percentual' => $preset['valor_residual_percentual'],
            ];

            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'tipo_bem_id')) {
                $dadosRegra['tipo_bem_id'] = $tipoBemModel?->id;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'nome_regra')) {
                $dadosRegra['nome_regra'] = "Regra padrao fiscal - {$preset['nome_exibicao']}";
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'base_regra')) {
                $dadosRegra['base_regra'] = 'fiscal';
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'metodo_depreciacao')) {
                $dadosRegra['metodo_depreciacao'] = 'linha_reta';
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'taxa_anual_percentual')) {
                $dadosRegra['taxa_anual_percentual'] = $taxaPadrao;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'depreciavel')) {
                $dadosRegra['depreciavel'] = $depreciavel;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'requer_override_manual')) {
                $dadosRegra['requer_override_manual'] = false;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'data_inicio_vigencia')) {
                $dadosRegra['data_inicio_vigencia'] = now()->toDateString();
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'ativo')) {
                $dadosRegra['ativo'] = true;
            }

            $regraCriada = RegraDepreciacaoTipoBem::query()->create($dadosRegra);

            return $regraCriada->load('metodoDepreciacao');
        } catch (\Throwable) {
            return $this->resolverRegraPorTipoBem($empresaId, $tipoBemNormalizado);
        }
    }

    public function sincronizarRegrasPadraoPorEmpresa(int $empresaId): int
    {
        $metodoLinhaReta = MetodoDepreciacao::query()
            ->where('codigo', 'LINHA_RETA')
            ->first();

        if (! $metodoLinhaReta) {
            return 0;
        }

        $tiposBase = collect(self::PRESETS_TIPO_BEM)
            ->map(fn (array $preset): string => (string) $preset['nome']);

        if (Schema::hasTable('tipos_bens_patrimoniais')) {
            $tiposBase = $tiposBase->merge(
                TipoBemPatrimonial::query()
                    ->where('empresa_id', $empresaId)
                    ->pluck('nome')
                    ->map(fn (?string $nome): string => trim((string) $nome)),
            );
        }

        $tipos = $tiposBase->merge(
            BemPatrimonial::query()
                ->where('empresa_id', $empresaId)
                ->whereNotNull('categoria')
                ->pluck('categoria')
                ->map(fn (?string $categoria): string => trim((string) $categoria)),
        )
            ->filter(fn (string $tipo): bool => $tipo !== '')
            ->unique(fn (string $tipo): string => $this->normalizarTipoBem($tipo))
            ->values();

        $mapaExistentes = RegraDepreciacaoTipoBem::query()
            ->where('empresa_id', $empresaId)
            ->get()
            ->mapWithKeys(fn (RegraDepreciacaoTipoBem $regra): array => [
                $this->normalizarTipoBem((string) $regra->tipo_bem) => true,
            ]);

        $novasRegras = [];

        foreach ($tipos as $tipoBem) {
            $chaveTipo = $this->normalizarTipoBem($tipoBem);
            $preset = $this->obterPresetPadraoPorTipoBem($tipoBem);

            if (! $preset || $mapaExistentes->has($chaveTipo)) {
                continue;
            }

            $depreciavel = ! str_contains($chaveTipo, 'terreno');
            $taxaPadrao = $depreciavel ? round(100 / $preset['vida_util_anos'], 4) : 0.0;
            $tipoBemModel = null;
            if (Schema::hasTable('tipos_bens_patrimoniais')) {
                $tipoBemModel = TipoBemPatrimonial::query()->firstOrCreate([
                    'empresa_id' => $empresaId,
                    'nome' => $preset['nome_exibicao'],
                ]);
            }

            $mapaExistentes->put($chaveTipo, true);
            $dadosRegra = [
                'empresa_id' => $empresaId,
                'tipo_bem' => $preset['nome_exibicao'],
                'metodo_depreciacao_id' => $metodoLinhaReta->id,
                'vida_util_anos' => $preset['vida_util_anos'],
                'taxa_anual' => $taxaPadrao,
                'valor_residual_percentual' => $preset['valor_residual_percentual'],
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'tipo_bem_id')) {
                $dadosRegra['tipo_bem_id'] = $tipoBemModel?->id;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'nome_regra')) {
                $dadosRegra['nome_regra'] = "Regra padrao fiscal - {$preset['nome_exibicao']}";
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'base_regra')) {
                $dadosRegra['base_regra'] = 'fiscal';
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'metodo_depreciacao')) {
                $dadosRegra['metodo_depreciacao'] = 'linha_reta';
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'taxa_anual_percentual')) {
                $dadosRegra['taxa_anual_percentual'] = $taxaPadrao;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'depreciavel')) {
                $dadosRegra['depreciavel'] = $depreciavel;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'requer_override_manual')) {
                $dadosRegra['requer_override_manual'] = false;
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'data_inicio_vigencia')) {
                $dadosRegra['data_inicio_vigencia'] = now()->toDateString();
            }
            if (Schema::hasColumn('regras_depreciacao_tipos_bens', 'ativo')) {
                $dadosRegra['ativo'] = true;
            }

            $novasRegras[] = $dadosRegra;
        }

        if ($novasRegras === []) {
            return 0;
        }

        RegraDepreciacaoTipoBem::query()->insert($novasRegras);

        return count($novasRegras);
    }

    public function obterPresetPadraoPorTipoBem(?string $tipoBem): ?array
    {
        $tipoNormalizado = $this->normalizarTipoBem($tipoBem);

        if ($tipoNormalizado === '') {
            return null;
        }

        if (str_contains($tipoNormalizado, 'terreno')) {
            return [
                'chave' => 'terrenos',
                'nome_exibicao' => 'Terrenos',
                'vida_util_anos' => 1,
                'valor_residual_percentual' => 0.0,
            ];
        }

        if (str_contains($tipoNormalizado, 'edificacao') || str_contains($tipoNormalizado, 'predio')) {
            return [
                'chave' => 'edificacoes',
                'nome_exibicao' => 'Edificacoes',
                'vida_util_anos' => 25,
                'valor_residual_percentual' => 0.0,
            ];
        }

        foreach (self::PRESETS_TIPO_BEM as $chave => $preset) {
            if ($tipoNormalizado === $chave || str_contains($tipoNormalizado, $chave)) {
                return [
                    'chave' => $chave,
                    'nome_exibicao' => (string) $preset['nome'],
                    'vida_util_anos' => (int) $preset['vida_util_anos'],
                    'valor_residual_percentual' => (float) $preset['valor_residual_percentual'],
                ];
            }
        }

        return null;
    }

    protected function normalizarTipoBem(?string $tipoBem): string
    {
        $valor = Str::ascii(Str::lower(trim((string) $tipoBem)));

        return (string) preg_replace('/[^a-z0-9]+/', '', $valor);
    }

    protected function calcularAnosDepreciados(BemPatrimonial $bem, string $dataCalculo, int $vidaUtilAnos): int
    {
        if (! $bem->data_aquisicao) {
            return 1;
        }

        $inicio = $bem->data_aquisicao->copy()->startOfYear();
        $fim = Carbon::parse($dataCalculo)->startOfYear();
        $anos = $inicio->diffInYears($fim) + 1;

        return max(1, min($vidaUtilAnos, $anos));
    }

    protected function validarVidaUtil(int $vidaUtilAnos): void
    {
        if ($vidaUtilAnos <= 0) {
            throw ValidationException::withMessages([
                'vida_util_anos' => 'A vida util deve ser maior que zero.',
            ]);
        }
    }
}
