<?php

namespace App\Domain\Depreciation\Services;

use App\Domain\AssetRegistry\Models\BemPatrimonial;
use App\Domain\Organization\Models\Empresa;
use Illuminate\Support\Carbon;

/**
 * RASCUNHO do Bloco G (EFD ICMS/IPI — CIAP).
 *
 * ================== LEIA ANTES DE USAR ==================
 * Este serviço MONTA os registros do Bloco G a partir do CIAP que o sistema
 * já calcula (crédito de ICMS do bem, 1/48, fator por competência). Ele é um
 * RASCUNHO para o contador conferir — NÃO é o arquivo SPED validado e NÃO
 * deve ser transmitido como está.
 *
 * O que ele NÃO faz, de propósito:
 *  - Não gera os blocos 0 (abertura/cadastros), 1, 9 (totalização do arquivo)
 *    nem o 0000 com os dados do declarante — isso depende do leiaute vigente,
 *    do regime e do plano de contas, que são do cliente e do contador.
 *  - Não valida contra o PVA. O leiaute muda a cada ano (COD_VER / Ato
 *    COTEPE); a posição e a obrigatoriedade dos campos têm de ser conferidas
 *    no PVA vigente antes de qualquer entrega.
 *  - Não inventa dados de nota fiscal (G130/G140): o sistema não guarda NF do
 *    bem. Esses registros só saem se vierem nos parâmetros; senão viram
 *    PENDÊNCIA nomeada no retorno.
 *
 * Estrutura de referência: Guia Prático da EFD ICMS/IPI, Bloco G. As posições
 * aqui seguem essa referência, mas DEVEM ser validadas no PVA vigente.
 * ========================================================
 */
class SpedBlocoGService
{
    public function __construct(private readonly CiapService $ciap)
    {
    }

    /**
     * Monta o Bloco G de uma competência (mês).
     *
     * @param  array<string, mixed>  $parametros  dados que são do cliente/contador
     *         (ver montarPendencias()); especialmente $parametros['documentos']
     *         = [ bem_id => ['ind_emit','cod_part','cod_mod','serie','num_doc','chv_nfe','num_item','cod_item'] ]
     * @return array<string, mixed>
     */
    public function gerar(Empresa $empresa, string $competencia, array $parametros = []): array
    {
        $mes = Carbon::parse($competencia)->startOfMonth();
        $dtIni = $mes->copy()->startOfMonth();
        $dtFin = $mes->copy()->endOfMonth();

        $apuracao = $this->ciap->apuracaoDaCompetencia($empresa->id, $mes->toDateString());
        $documentos = (array) ($parametros['documentos'] ?? []);

        $linhas = [];
        $pendencias = $this->montarPendencias($empresa, $apuracao, $documentos, $parametros);

        // G001 — abertura do bloco. IND_MOV: 0 = bloco com dados, 1 = sem dados.
        $temDados = $apuracao['bens'] > 0;
        $linhas[] = $this->linha(['G001', $temDados ? '0' : '1']);

        $somParc = 0.0;      // Σ das parcelas passíveis (1/48, sem fator) — G110.SOM_PARC
        $icmsAprop = 0.0;    // Σ efetivamente apropriado (com fator)      — G110.ICMS_APROP

        if ($temDados) {
            // G110 — ICMS Ativo Permanente (CIAP), um por período.
            // Emitido com placeholders de saldo; os totais de parcela são
            // somados a partir dos G125 e preenchidos ao final (abaixo).
            $posicaoG110 = count($linhas);
            $linhas[] = null; // reservado — preenchido depois de somar os G125

            foreach ($apuracao['linhas'] as $item) {
                $bem = BemPatrimonial::query()->find($item['bem_patrimonial_id']);
                if ($bem === null) {
                    continue;
                }

                $cronograma = $this->ciap->cronogramaDoBem($bem);
                $parcelaPassivel = (float) ($cronograma['parcela_mensal'] ?? 0); // 1/48 do crédito, sem fator
                $somParc = round($somParc + $parcelaPassivel, 2);
                $icmsAprop = round($icmsAprop + (float) $item['valor_apropriado'], 2);

                $codIndBem = $this->codIndBem($bem);

                // G125 — movimentação do bem no período.
                // TIPO_MOV = SI (saldo inicial do período de apuração). Na
                // primeira competência do bem o correto pode ser IM
                // (imobilização) — isso depende do histórico e o contador ajusta.
                $linhas[] = $this->linha([
                    'G125',
                    $codIndBem,
                    $dtIni->format('dmY'),
                    'SI',
                    $this->num((float) $item['credito_icms']), // VL_IMOB_ICMS_OP (crédito da operação própria)
                    $this->num(0),                              // VL_IMOB_ICMS_ST
                    $this->num(0),                              // VL_IMOB_ICMS_FRT
                    $this->num(0),                              // VL_IMOB_ICMS_DIF
                    (string) $item['parcela'],                  // NUM_PARC (1..48)
                    $this->num($parcelaPassivel),               // VL_PARC_PASS (1/48, sem fator)
                ]);

                // G130/G140 — documento fiscal e item. Só saem se os dados da
                // NF vierem nos parâmetros; o sistema não guarda NF do bem.
                $doc = $documentos[$bem->id] ?? $documentos[(string) $bem->id] ?? null;
                if (is_array($doc)) {
                    $linhas[] = $this->linha([
                        'G130',
                        (string) ($doc['ind_emit'] ?? '0'),
                        (string) ($doc['cod_part'] ?? ''),
                        (string) ($doc['cod_mod'] ?? ''),
                        (string) ($doc['serie'] ?? ''),
                        (string) ($doc['num_doc'] ?? ''),
                        (string) ($doc['chv_nfe'] ?? ''),
                    ]);
                    $linhas[] = $this->linha([
                        'G140',
                        (string) ($doc['num_item'] ?? '1'),
                        (string) ($doc['cod_item'] ?? $codIndBem),
                    ]);
                }
            }

            // Preenche o G110 agora que temos os somatórios.
            $fator = (float) $apuracao['fator'];
            $linhas[$posicaoG110] = $this->linha([
                'G110',
                $dtIni->format('dmY'),
                $dtFin->format('dmY'),
                $this->placeholder('SALDO_IN_ICMS'),  // saldo acumulado de períodos anteriores — vem da escrituração
                $this->num($somParc),                 // SOM_PARC (Σ 1/48 do período)
                $this->placeholder('VL_TRIB_EXP'),    // saídas tributadas + exportação — da apuração de ICMS
                $this->placeholder('VL_TOTAL'),        // total das saídas — da apuração de ICMS
                $this->numFator($fator),              // IND_PER_SAI (fator tributadas/totais)
                $this->num($icmsAprop),               // ICMS_APROP (= SOM_PARC × fator)
                $this->num(0),                        // SOM_ICMS_OC (outros créditos G126)
            ]);
        }

        // G990 — encerramento: quantidade de linhas do bloco (inclui G001 e o próprio G990).
        $qtdLinhas = count(array_filter($linhas, static fn ($l): bool => $l !== null)) + 1;
        $linhas[] = $this->linha(['G990', (string) $qtdLinhas]);

        $conteudo = implode("\n", array_filter($linhas, static fn ($l): bool => $l !== null)) . "\n";

        return [
            'aviso' => 'RASCUNHO — Bloco G do CIAP para conferência do contador. '
                . 'Não é arquivo SPED validado e não deve ser transmitido como está. '
                . 'Valide o leiaute (COD_VER) e todos os campos no PVA vigente.',
            'competencia' => $mes->toDateString(),
            'mes' => $mes->format('m/Y'),
            'registros' => $qtdLinhas,
            'bens' => $apuracao['bens'],
            'pendencias' => $pendencias,
            'linhas' => array_values(array_filter($linhas, static fn ($l): bool => $l !== null)),
            'conteudo' => $conteudo,
        ];
    }

    /**
     * Tudo que é do cliente/contador e NÃO pode ser inventado pelo sistema.
     *
     * @param  array<string, mixed>  $apuracao
     * @param  array<int|string, mixed>  $documentos
     * @param  array<string, mixed>  $parametros
     * @return list<string>
     */
    private function montarPendencias(Empresa $empresa, array $apuracao, array $documentos, array $parametros): array
    {
        $p = [];

        if (empty($empresa->cnpj)) {
            $p[] = 'CNPJ do declarante ausente no cadastro da empresa (registro 0000 do arquivo).';
        }
        if (empty($empresa->inscricao_estadual)) {
            $p[] = 'Inscrição Estadual ausente no cadastro da empresa (registro 0000).';
        }

        $p[] = 'COD_VER (versão do leiaute) do registro 0000 depende do período e do '
            . 'Ato COTEPE vigente — definir com o contador e validar no PVA.';
        $p[] = 'Blocos 0 (abertura e cadastros 0000/0005/0100/0150/0190/0200), 1 e 9 '
            . '(totalização) não são gerados aqui — são montados pelo contador no PVA.';
        $p[] = 'G110: SALDO_IN_ICMS, VL_TRIB_EXP e VL_TOTAL vêm da apuração de ICMS do '
            . 'período (escrituração fiscal), não do controle patrimonial.';

        $bensSemDoc = [];
        foreach (($apuracao['linhas'] ?? []) as $item) {
            $id = $item['bem_patrimonial_id'];
            if (!isset($documentos[$id]) && !isset($documentos[(string) $id])) {
                $bensSemDoc[] = $item['numero_tombo'] ?: ('#' . $id);
            }
        }
        if ($bensSemDoc !== []) {
            $p[] = 'G130/G140 (nota fiscal de origem: modelo, série, número, chave NFe, '
                . 'fornecedor/COD_PART, item) não informados para os bens: '
                . implode(', ', $bensSemDoc) . '. O sistema não guarda NF do bem.';
        }

        $p[] = 'COD_IND_BEM usado = número de tombo do bem. Confirmar com o contador se '
            . 'o código individualizador do CIAP é esse ou outro do plano de bens.';
        $p[] = 'TIPO_MOV de cada G125 saiu como "SI" (saldo inicial do período). Na '
            . 'competência de entrada do bem o correto costuma ser "IM" (imobilização) — '
            . 'o contador ajusta conforme o histórico.';

        return $p;
    }

    /** Código individualizador do bem no CIAP (parametrizável; default = tombo). */
    private function codIndBem(BemPatrimonial $bem): string
    {
        return (string) ($bem->numero_tombo ?: ('BEM' . $bem->id));
    }

    /** Monta uma linha SPED: |CAMPO|CAMPO|...| */
    private function linha(array $campos): string
    {
        return '|' . implode('|', $campos) . '|';
    }

    /** Valor monetário no padrão SPED: vírgula decimal, 2 casas, sem milhar. */
    private function num(float $valor): string
    {
        return number_format($valor, 2, ',', '');
    }

    /** Fator de proporcionalidade com mais casas (padrão aceita até 6). */
    private function numFator(float $valor): string
    {
        return rtrim(rtrim(number_format($valor, 6, ',', ''), '0'), ',') ?: '0';
    }

    /** Marca visível de campo que o contador tem de preencher na conferência. */
    private function placeholder(string $campo): string
    {
        return '{{' . $campo . '}}';
    }
}
