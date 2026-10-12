<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Depreciation\Enums\MetodoDepreciacaoRegraEnum;
use App\Domain\Depreciation\Enums\TipoEventoValorEnum;
use App\Domain\Depreciation\Models\EventoValorBem;
use App\Domain\Depreciation\Models\ProducaoBem;
use App\Domain\Depreciation\Support\ParcelaDepreciacao;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

/**
 * Cronograma de depreciacao de um bem: a memoria de calculo, mes a mes.
 *
 * Este servico e a unica fonte da verdade do quanto deprecia. Ele nao grava
 * nada — devolve as parcelas, e quem decide o que fazer com elas e o
 * DepreciacaoService (razao mensal) ou a tela de memoria de calculo.
 *
 * Regras brasileiras que ele respeita, e que o motor anterior nao respeitava:
 *
 *  - A quota comeca no MES em que o bem fica disponivel para uso (art. 317
 *    do RIR/2018; CPC 27 fala em "disponivel para uso"), nao no ano da nota
 *    fiscal. Antes, um bem comprado em 20/12 levava um ano inteiro de
 *    depreciacao em 11 dias.
 *  - A conta e MENSAL. O mes de entrada conta inteiro, que e a pratica
 *    adotada pelos sistemas do mercado e aceita pela Receita (a quota e
 *    mensal, nao diaria).
 *  - A depreciacao para quando o valor contabil chega ao valor residual, ou
 *    quando o bem e baixado — o que vier primeiro.
 *  - Terreno nao deprecia.
 *
 * O arredondamento e por parcela, com a ultima parcela absorvendo a
 * diferenca de centavos: a soma do cronograma fecha exatamente com o valor
 * depreciavel, sem sobra nem falta.
 */
class CronogramaDepreciacaoService
{
    public function __construct(private readonly RegraDepreciacaoEfetivaResolverService $resolver)
    {
    }

    /**
     * @return array{
     *     depreciavel: bool,
     *     motivo: ?string,
     *     parcelas: array<int, ParcelaDepreciacao>,
     *     regra: array<string, mixed>,
     *     valor_aquisicao: float,
     *     valor_residual: float,
     *     valor_depreciavel: float,
     *     inicio: ?string,
     *     meses_vida_util: int
     * }
     */
    public function gerar(
        BemPatrimonial $bem,
        string $baseRegra = 'fiscal',
        ?string $ateCompetencia = null,
    ): array {
        $limite = $this->competenciaDe($ateCompetencia ?? now()->toDateString());
        $regra = $this->resolver->resolverRegraEfetivaParaBem($bem, $baseRegra, $limite->copy()->endOfMonth()->toDateString());

        $vazio = fn (string $motivo): array => [
            'depreciavel' => false,
            'motivo' => $motivo,
            'parcelas' => [],
            'regra' => $regra,
            'valor_aquisicao' => (float) ($bem->valor_aquisicao ?? 0),
            'valor_residual' => 0.0,
            'valor_depreciavel' => 0.0,
            'inicio' => null,
            'meses_vida_util' => 0,
        ];

        if (! (bool) ($regra['depreciavel'] ?? true)) {
            return $vazio('O tipo deste bem não é depreciável (terrenos, por exemplo).');
        }

        $inicio = $this->competenciaDeInicio($bem, $regra);

        if ($inicio === null) {
            return $vazio('O bem não tem data de aquisição nem data de início de uso.');
        }

        $valorAquisicao = round((float) ($bem->valor_aquisicao ?? 0), 2);

        if ($valorAquisicao <= 0) {
            return $vazio('O bem não tem valor de aquisição.');
        }

        $valorResidual = $this->valorResidual($bem, $regra, $valorAquisicao);
        $valorDepreciavel = round(max(0, $valorAquisicao - $valorResidual), 2);

        if ($valorDepreciavel <= 0) {
            return $vazio('O valor residual já alcança o valor de aquisição: não há o que depreciar.');
        }

        $mesesVidaUtil = $this->mesesDeVidaUtil($regra);

        if ($mesesVidaUtil <= 0) {
            return $vazio('A regra aplicada a este bem não tem vida útil definida.');
        }

        $fim = $this->competenciaFinal($bem, $inicio, $mesesVidaUtil);

        if ($fim->lt($inicio)) {
            return [
                'depreciavel' => true,
                'motivo' => null,
                'parcelas' => [],
                'regra' => $regra,
                'valor_aquisicao' => $valorAquisicao,
                'valor_residual' => $valorResidual,
                'valor_depreciavel' => $valorDepreciavel,
                'inicio' => $inicio->toDateString(),
                'meses_vida_util' => $mesesVidaUtil,
            ];
        }

        // Eventos de valor (acrescimo, reavaliacao, impairment, baixa
        // parcial) mudam a base ao longo da vida. Quando existem, o
        // cronograma e refeito mes a mes, prospectivamente (CPC 27); sem
        // eventos, segue o caminho normal — que preserva soma dos digitos e
        // unidades produzidas exatamente como antes.
        $eventos = $this->eventosDoBem($bem);

        $parcelas = $eventos === []
            ? $this->montarParcelas(
                $bem,
                $regra,
                $inicio,
                $fim,
                $valorAquisicao,
                $valorResidual,
                $valorDepreciavel,
                $mesesVidaUtil,
            )
            : $this->montarParcelasComEventos(
                $regra,
                $inicio,
                $fim,
                $valorAquisicao,
                $valorResidual,
                $mesesVidaUtil,
                $eventos,
            );

        // O recorte vem por ultimo: o cronograma completo e que define a
        // quota de cada mes e quem recebe a sobra do arredondamento.
        $parcelas = array_values(array_filter(
            $parcelas,
            static fn (ParcelaDepreciacao $parcela): bool => $parcela->competencia->lte($limite),
        ));

        return [
            'depreciavel' => true,
            'motivo' => null,
            'parcelas' => $parcelas,
            'regra' => $regra,
            'valor_aquisicao' => $valorAquisicao,
            'valor_residual' => $valorResidual,
            'valor_depreciavel' => $valorDepreciavel,
            'inicio' => $inicio->toDateString(),
            'meses_vida_util' => $mesesVidaUtil,
        ];
    }

    /** A parcela de uma competencia especifica, quando existe. */
    public function parcelaDaCompetencia(BemPatrimonial $bem, string $baseRegra, string $competencia): ?ParcelaDepreciacao
    {
        $alvo = $this->competenciaDe($competencia)->toDateString();
        $cronograma = $this->gerar($bem, $baseRegra, $competencia);

        foreach ($cronograma['parcelas'] as $parcela) {
            if ($parcela->competenciaIso() === $alvo) {
                return $parcela;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $regra
     * @return array<int, ParcelaDepreciacao>
     */
    private function montarParcelas(
        BemPatrimonial $bem,
        array $regra,
        Carbon $inicio,
        Carbon $fim,
        float $valorAquisicao,
        float $valorResidual,
        float $valorDepreciavel,
        int $mesesVidaUtil,
    ): array {
        $metodo = (string) ($regra['metodo'] ?? MetodoDepreciacaoRegraEnum::LINHA_RETA->value);
        $coeficiente = max(1.0, (float) ($regra['coeficiente_aceleracao'] ?? 1));

        $quotas = match ($metodo) {
            MetodoDepreciacaoRegraEnum::SOMA_DIGITOS->value => $this->quotasSomaDigitos($valorDepreciavel, $mesesVidaUtil),
            MetodoDepreciacaoRegraEnum::UNIDADES_PRODUZIDAS->value => $this->quotasUnidadesProduzidas(
                $bem,
                $regra,
                $valorDepreciavel,
                $inicio,
                $mesesVidaUtil,
            ),
            default => $this->quotasLinhaReta($valorDepreciavel, $mesesVidaUtil),
        };

        $parcelas = [];
        $acumulado = 0.0;
        $competencia = $inicio->copy();
        $indice = 0;

        while ($competencia->lte($fim) && $acumulado < $valorDepreciavel) {
            $quota = round(($quotas[$indice] ?? 0) * $coeficiente, 2);

            // Nunca passa do valor depreciavel: a ultima parcela e o resto.
            if ($acumulado + $quota > $valorDepreciavel) {
                $quota = round($valorDepreciavel - $acumulado, 2);
            }

            // Com aceleracao a vida acaba antes; sem producao apontada a
            // quota do mes e zero, e o mes passa sem depreciar.
            if ($quota > 0) {
                $acumulado = round($acumulado + $quota, 2);
                $parcelas[] = new ParcelaDepreciacao(
                    competencia: $competencia->copy(),
                    valorDepreciacao: $quota,
                    acumulado: $acumulado,
                    valorContabil: round($valorAquisicao - $acumulado, 2),
                    mesesDepreciados: count($parcelas) + 1,
                );
            }

            $competencia->addMonth();
            $indice++;
        }

        // Sobra de centavos do arredondamento entra na ultima parcela, para
        // o cronograma fechar exatamente com o valor depreciavel.
        //
        // So vale para CENTAVOS: em unidades produzidas o bem pode terminar
        // a vida util sem ter produzido tudo o que se esperava, e o que
        // faltou produzir nao e sobra de arredondamento — e valor que
        // simplesmente nao foi depreciado.
        $sobra = round($valorDepreciavel - $acumulado, 2);
        $toleranciaDeArredondamento = round(count($parcelas) * 0.01 + 0.01, 2);

        if ($sobra > 0 && $parcelas !== [] && $sobra <= $toleranciaDeArredondamento) {
            $ultima = array_pop($parcelas);
            $parcelas[] = new ParcelaDepreciacao(
                competencia: $ultima->competencia,
                valorDepreciacao: round($ultima->valorDepreciacao + $sobra, 2),
                acumulado: round($ultima->acumulado + $sobra, 2),
                valorContabil: round($ultima->valorContabil - $sobra, 2),
                mesesDepreciados: $ultima->mesesDepreciados,
            );
        }

        return $parcelas;
    }

    /**
     * Eventos de valor do bem, por competencia (dia 1 do mes).
     *
     * @return array<string, array<int, array{tipo: string, valor: float, nova_vida_util_meses: ?int}>>
     */
    private function eventosDoBem(BemPatrimonial $bem): array
    {
        if (! Schema::hasTable('eventos_valor_bens')) {
            return [];
        }

        $agrupados = [];

        $eventos = \App\Domain\Depreciation\Models\EventoValorBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->orderBy('competencia')
            ->orderBy('id')
            ->get();

        foreach ($eventos as $evento) {
            $chave = $this->competenciaDe((string) $evento->competencia)->toDateString();
            $agrupados[$chave][] = [
                'tipo' => (string) $evento->tipo,
                'valor' => (float) $evento->valor,
                'nova_vida_util_meses' => $evento->nova_vida_util_meses !== null ? (int) $evento->nova_vida_util_meses : null,
            ];
        }

        return $agrupados;
    }

    /**
     * Cronograma mes a mes com eventos de valor.
     *
     * Trabalha com o estado corrente do bem — valor contabil, residual e
     * meses que faltam — e, a cada competencia, aplica os eventos daquele
     * mes antes de calcular a quota. A quota do mes e sempre o que falta
     * depreciar dividido pelos meses restantes (linha reta prospectiva): e o
     * tratamento do CPC 27 para mudancas de estimativa, aplicado dali para
     * frente sem mexer no passado. Bem com evento deprecia o restante em
     * linha reta, mesmo que a regra fosse outro metodo — nao ha tratamento
     * padrao para misturar soma dos digitos com reavaliacao no meio da vida.
     *
     * @param  array<string, mixed>  $regra
     * @param  array<string, array<int, array{tipo: string, valor: float, nova_vida_util_meses: ?int}>>  $eventos
     * @return array<int, ParcelaDepreciacao>
     */
    private function montarParcelasComEventos(
        array $regra,
        Carbon $inicio,
        Carbon $fim,
        float $valorAquisicao,
        float $valorResidual,
        int $mesesVidaUtil,
        array $eventos,
    ): array {
        $coeficiente = max(1.0, (float) ($regra['coeficiente_aceleracao'] ?? 1));

        // Eventos podem estender a vida: o fim e recalculado dentro do laco.
        $fimLimite = $fim->copy();
        foreach ($eventos as $chave => $_) {
            $competenciaEvento = $this->competenciaDe($chave);
            if ($competenciaEvento->gt($fimLimite)) {
                $fimLimite = $competenciaEvento->copy();
            }
        }

        $valorContabil = $valorAquisicao;
        $residual = $valorResidual;
        $mesesRestantes = $mesesVidaUtil;
        $acumulado = 0.0;
        $competencia = $inicio->copy();
        $parcelas = [];
        $guarda = 0;

        while ($competencia->lte($fimLimite) && $guarda < 1200) {
            $guarda++;

            // 1. Eventos deste mes mudam o estado antes da quota.
            foreach ($eventos[$competencia->toDateString()] ?? [] as $evento) {
                [$valorContabil, $residual, $mesesRestantes] = $this->aplicarEvento(
                    $evento,
                    $valorContabil,
                    $residual,
                    $mesesRestantes,
                );
            }

            // 2. Quota do mes: o que falta depreciar sobre os meses restantes.
            $aDepreciar = round($valorContabil - $residual, 2);
            $quota = 0.0;

            if ($aDepreciar > 0 && $mesesRestantes > 0) {
                $quota = round(($aDepreciar / $mesesRestantes) * $coeficiente, 2);

                if ($quota > $aDepreciar) {
                    $quota = $aDepreciar;
                }
            }

            if ($quota > 0) {
                $valorContabil = round($valorContabil - $quota, 2);
                $acumulado = round($acumulado + $quota, 2);
                $parcelas[] = new ParcelaDepreciacao(
                    competencia: $competencia->copy(),
                    valorDepreciacao: $quota,
                    acumulado: $acumulado,
                    valorContabil: $valorContabil,
                    mesesDepreciados: count($parcelas) + 1,
                );
            }

            if ($mesesRestantes > 0) {
                $mesesRestantes--;
            }

            $competencia->addMonth();
        }

        return $parcelas;
    }

    /**
     * Aplica um evento de valor ao estado corrente do bem.
     *
     * @param  array{tipo: string, valor: float, nova_vida_util_meses: ?int}  $evento
     * @return array{0: float, 1: float, 2: int}  [valorContabil, residual, mesesRestantes]
     */
    private function aplicarEvento(array $evento, float $valorContabil, float $residual, int $mesesRestantes): array
    {
        $valor = round((float) $evento['valor'], 2);
        $novaVida = $evento['nova_vida_util_meses'];

        switch ($evento['tipo']) {
            case TipoEventoValorEnum::ACRESCIMO->value:
                // A benfeitoria entra no valor e deprecia no tempo que falta
                // (ou na vida nova, se informada).
                $valorContabil = round($valorContabil + $valor, 2);
                break;

            case TipoEventoValorEnum::REAVALIACAO->value:
                // O bem passa a valer o novo valor informado.
                $valorContabil = $valor;
                break;

            case TipoEventoValorEnum::IMPAIRMENT->value:
                // Perda ao valor recuperavel: reduz o contabil, nunca abaixo
                // do residual.
                $valorContabil = round(max($residual, $valorContabil - $valor), 2);
                break;

            case TipoEventoValorEnum::BAIXA_PARCIAL->value:
                // Parte do bem sai: o residual encolhe na mesma proporcao.
                $fracaoRestante = $valorContabil > 0 ? max(0.0, ($valorContabil - $valor) / $valorContabil) : 0.0;
                $residual = round($residual * $fracaoRestante, 2);
                $valorContabil = round(max(0.0, $valorContabil - $valor), 2);
                break;
        }

        if ($novaVida !== null && $novaVida > 0) {
            $mesesRestantes = $novaVida;
        } elseif ($mesesRestantes <= 0) {
            // Evento depois do fim da vida: da um mes para absorver o ajuste.
            $mesesRestantes = 1;
        }

        return [$valorContabil, $residual, $mesesRestantes];
    }

    /** @return array<int, float> */
    private function quotasLinhaReta(float $valorDepreciavel, int $meses): array
    {
        $quota = round($valorDepreciavel / $meses, 2);

        return array_fill(0, $meses, $quota);
    }

    /**
     * Soma dos digitos: deprecia mais no comeco da vida.
     *
     * A soma e feita por ANO (e assim que o metodo e definido) e a quota do
     * ano e dividida nos 12 meses, para a conta continuar mensal.
     *
     * @return array<int, float>
     */
    private function quotasSomaDigitos(float $valorDepreciavel, int $meses): array
    {
        $anos = (int) ceil($meses / 12);
        $somaDigitos = ($anos * ($anos + 1)) / 2;
        $quotas = [];

        for ($ano = 1; $ano <= $anos; $ano++) {
            $pesoDoAno = ($anos - $ano + 1) / $somaDigitos;
            $quotaAnual = $valorDepreciavel * $pesoDoAno;
            $mesesDoAno = min(12, $meses - (($ano - 1) * 12));

            for ($mes = 0; $mes < $mesesDoAno; $mes++) {
                $quotas[] = round($quotaAnual / $mesesDoAno, 2);
            }
        }

        return $quotas;
    }

    /**
     * Unidades produzidas: a quota do mes e proporcional ao que o bem
     * produziu naquele mes, sobre o total que ele deve produzir na vida.
     *
     * Mes sem apontamento nao deprecia — e o comportamento correto do
     * metodo, e nao uma falha.
     *
     * @param  array<string, mixed>  $regra
     * @return array<int, float>
     */
    private function quotasUnidadesProduzidas(
        BemPatrimonial $bem,
        array $regra,
        float $valorDepreciavel,
        Carbon $inicio,
        int $meses,
    ): array {
        $total = (int) ($regra['unidades_vida_util'] ?? 0);

        if ($total <= 0) {
            return array_fill(0, $meses, 0.0);
        }

        $producao = ProducaoBem::query()
            ->where('bem_patrimonial_id', $bem->id)
            ->pluck('unidades', 'competencia');

        $quotas = [];
        $competencia = $inicio->copy();

        for ($i = 0; $i < $meses; $i++) {
            $chave = $competencia->toDateString();
            $unidades = (int) ($producao[$chave] ?? 0);
            $quotas[] = $unidades > 0 ? round(($valorDepreciavel * $unidades) / $total, 2) : 0.0;
            $competencia->addMonth();
        }

        return $quotas;
    }

    /** @param array<string, mixed> $regra */
    private function valorResidual(BemPatrimonial $bem, array $regra, float $valorAquisicao): float
    {
        // O que foi informado no proprio bem manda: e a estimativa de quem
        // conhece o ativo (CPC 27). A regra so preenche o que faltou.
        if ($bem->valor_residual !== null && (float) $bem->valor_residual > 0) {
            return round((float) $bem->valor_residual, 2);
        }

        $monetario = $regra['valor_residual_monetario'] ?? null;

        if ($monetario !== null && (float) $monetario > 0) {
            return round((float) $monetario, 2);
        }

        $percentual = (float) ($regra['valor_residual_percentual'] ?? 0);

        return $percentual > 0 ? round(($valorAquisicao * $percentual) / 100, 2) : 0.0;
    }

    /** @param array<string, mixed> $regra */
    private function mesesDeVidaUtil(array $regra): int
    {
        $anos = (int) ($regra['vida_util_anos'] ?? 0);

        if ($anos > 0) {
            return $anos * 12;
        }

        // Sem vida util explicita, a taxa anual diz quanto tempo o bem dura.
        $taxa = (float) ($regra['taxa_anual_percentual'] ?? 0);

        return $taxa > 0 ? (int) round((100 / $taxa) * 12) : 0;
    }

    /** @param array<string, mixed> $regra */
    private function competenciaDeInicio(BemPatrimonial $bem, array $regra): ?Carbon
    {
        // Ordem de preferencia: o que foi definido no parametro do bem, a
        // data em que ele entrou em uso e, por ultimo, a aquisicao.
        $inicio = $regra['data_inicio_depreciacao']
            ?? $bem->data_inicio_uso?->toDateString()
            ?? $bem->data_aquisicao?->toDateString();

        return $inicio ? $this->competenciaDe((string) $inicio) : null;
    }

    /** Ultimo mes que o bem deprecia: fim da vida util ou mes da baixa. */
    private function competenciaFinal(BemPatrimonial $bem, Carbon $inicio, int $mesesVidaUtil): Carbon
    {
        $fim = $inicio->copy()->addMonths($mesesVidaUtil - 1);

        // Bem baixado para de depreciar no mes da baixa.
        $baixa = $bem->baixas()->orderBy('data_baixa')->value('data_baixa');

        if ($baixa) {
            $competenciaBaixa = $this->competenciaDe((string) $baixa);

            if ($competenciaBaixa->lt($fim)) {
                $fim = $competenciaBaixa;
            }
        }

        return $fim;
    }

    private function competenciaDe(string $data): Carbon
    {
        return Carbon::parse($data)->startOfMonth()->startOfDay();
    }
}
