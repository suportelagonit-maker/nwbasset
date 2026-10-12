# Depreciação no NWB Asset

Como o módulo calcula, por que cada decisão foi tomada e o que ainda falta.
Escrito para quem for mexer nisso depois — e para quem precisar explicar o
número a um contador ou a um auditor.

## 1. A regra brasileira, em duas camadas

**Fiscal (IRPJ/CSLL no Lucro Real)** — o Anexo III da IN RFB 1.700/2017 fixa
a taxa **máxima** dedutível. A quota é deduzida **a partir do mês em que o
bem é instalado ou posto em serviço** (art. 317 do RIR/2018), não da data da
nota fiscal. Terreno não deprecia.

**Societária (CPC 27 / Lei 6.404)** — vale a vida útil econômica real e o
valor residual, revisados ao menos anualmente. Pode divergir da fiscal; a
diferença vai para o e-LALUR.

O sistema mantém **as duas bases em paralelo**, como os sistemas de mercado.
Cada apuração grava uma linha por bem, por base e por mês.

## 2. Como o cálculo funciona

`CronogramaDepreciacaoService` é a única fonte da verdade: ele devolve a
**memória de cálculo** do bem, mês a mês. Nada mais calcula depreciação no
sistema — a apuração mensal e a tela de memória leem o mesmo cronograma, e
por isso nunca divergem.

- **Quota mensal**, começando no mês em que o bem fica disponível para uso
  (`bens_patrimoniais.data_inicio_uso`; em branco, vale a aquisição).
- **Para** quando o valor contábil chega ao residual, quando a vida útil
  acaba ou quando o bem é baixado — o que vier primeiro.
- **Arredondamento**: a sobra de centavos entra na última parcela, e só ela
  — a tolerância é de um centavo por parcela. A soma do cronograma fecha
  exatamente com o valor depreciável.

### Métodos

| Método | Como calcula |
|---|---|
| Linha reta | Quota constante: base ÷ meses de vida útil |
| Soma dos dígitos | Peso maior no começo: a quota do ano `k` é `(n-k+1)/Σ` da base, dividida nos 12 meses |
| Unidades produzidas | Proporcional à produção apontada no mês (`producoes_bens`) sobre o total esperado. Mês sem apontamento não deprecia — é o comportamento certo do método |

**Depreciação acelerada por turnos** (art. 323 do RIR/2018) entra como
`coeficiente_aceleracao` na regra: 1,0 para um turno, 1,5 para dois, 2,0
para três. O coeficiente multiplica a quota e encurta a vida do bem.

### Valor residual

Precedência: o que foi informado **no próprio bem** manda (é a estimativa de
quem conhece o ativo, CPC 27); depois o valor monetário da regra; por fim o
percentual da regra.

## 3. Qual regra se aplica a um bem

Da mais específica para a mais genérica:

1. **Parâmetro do próprio bem** (`parametros_depreciacao_bens`) — ajuste
   manual, com motivo.
2. **Regra do tipo de produto** — "Veículos / Caminhão".
3. **Regra do tipo de bem** — "Veículos".
4. Fallback legado, quando não há nada cadastrado.

O nível do produto existe porque a tabela da Receita exige: **"Veículos" não
é uma taxa só.** Automóvel de passageiros é 5 anos (20% a.a.); caminhão,
ônibus, moto e trator são 4 anos (25% a.a.). Antes desta versão o produto
era perguntado no formulário e **descartado** no salvamento, e todo veículo
depreciava como automóvel.

## 4. Apuração e fechamento

`RazaoDepreciacaoService` grava o cronograma em `depreciacoes_bens`.

- **Apurar até uma competência** preenche todos os meses em aberto de uma
  vez — ninguém roda o sistema todo mês desde o início, e o acumulado só faz
  sentido com o histórico completo.
- **Recalcular é idempotente**: rodar duas vezes o mesmo mês atualiza, não
  duplica.
- **Fechar a competência congela o mês.** A apuração recomeça sempre do mês
  seguinte ao último fechado — deliberadamente, e não do último calculado:
  mês aberto tem de refletir a regra vigente. Se o contador corrigir uma
  taxa hoje, os meses ainda não fechados são recalculados e os fechados,
  nunca. É o fechamento, não o cálculo, que congela.
- **Reabrir exige motivo** (mínimo de 10 caracteres) e fica registrado com
  quem reabriu.

## 5. Tabela da Receita como ponto de partida

`TabelaPadraoDepreciacaoService` carrega o Anexo III nas duas bases. A
empresa nasce útil em vez de vazia — antes, sem regra cadastrada, ou tudo
caía num padrão único de 5 anos/20% ou o cálculo dava erro.

| Tipo | Vida útil | Taxa |
|---|---|---|
| Edificações / Imóveis (parte construída) | 25 anos | 4% |
| Instalações, Equipamentos, Mobiliário, Utensílios | 10 anos | 10% |
| Informática | 5 anos | 20% |
| Veículos (automóvel de passageiros) | 5 anos | 20% |
| Veículos / Caminhão, Ônibus, Moto, Trator, Van de carga | 4 anos | 25% |
| Equipamentos / Ferramenta elétrica e manual | 5 anos | 20% |
| Terrenos | — | não deprecia |

São taxas **máximas**: a empresa pode usar outra se comprovar a adequação, e
cada regra é editável. **Reaplicar a tabela não sobrescreve ajuste do
cliente** — só grava o que falta.

**Imóveis**: terreno e edificação devem ser cadastrados separados. O tipo
"Imóveis" deprecia a 4% e só deve conter a parte construída.

## 6. As peças

| Peça | Arquivo |
|---|---|
| Cronograma (memória de cálculo) | `backend/app/Domain/Depreciation/Services/CronogramaDepreciacaoService.php` |
| Razão mensal e fechamento | `.../Services/RazaoDepreciacaoService.php` |
| Qual regra se aplica | `.../Services/RegraDepreciacaoEfetivaResolverService.php` |
| Tabela da Receita | `.../Services/TabelaPadraoDepreciacaoService.php` e `.../Support/TabelaReceitaFederal.php` |
| API das operações | `.../Controllers/DepreciacaoOperacaoController.php` |
| Tela de apuração | `frontend-web/components/ApuracaoDepreciacao.tsx` |
| Memória de cálculo | `frontend-web/components/MemoriaCalculoDepreciacao.tsx` |
| Testes | `backend/tests/Feature/DepreciacaoMensalTest.php` e `DepreciacaoApiTest.php` |

Endpoints: `POST /api/v1/depreciacao/processar`, `/fechar`, `/reabrir`,
`/tabela-padrao`; `GET /api/v1/depreciacao/fechamentos`;
`GET /api/v1/bens/{bem}/cronograma-depreciacao`.

## 7. O que mudou nesta versão, e por quê

O motor anterior contava **anos-calendário cheios** a partir da aquisição.
Na prática:

```
Bem de R$ 10.000 comprado em 20/12 (5 anos, 20% a.a.)
  antes: 31/12 -> R$ 2.000,00 acumulados (11 dias de uso)
         05/01 -> R$ 4.000,00 acumulados (16 dias depois)
  agora: 31/12 -> R$   166,67
         31/01 -> R$   333,34
```

Também foram corrigidos nesta versão:

- **O método era decorativo**: "soma dos dígitos" e "unidades produzidas"
  existiam no enum, na tela e na tabela de regras, mas o motor sempre
  calculava linha reta.
- **Bem baixado continuava depreciando** — a rotina não filtrava status nem
  olhava a data de baixa.
- **As duas bases não cabiam no banco**: havia uma chave única por (bem,
  data de cálculo), o que tornava impossível guardar fiscal e societária do
  mesmo mês.
- **Uma regra por tipo de bem, no máximo**: a chave única das regras não
  considerava o produto, então "Veículos" e "Veículos / Caminhão" não
  podiam coexistir.
- **Tipo sem regra travava o cadastro** com "Vida útil não informada".
- **A vida útil do bem era ignorada** quando existia regra.

## 8. Eventos de valor (CPC 27 / CPC 01)

O valor de um bem não só cai em linha reta: ele recebe benfeitoria, é
reavaliado, sofre impairment ou tem baixa parcial. Cada um é um **evento de
valor** (`eventos_valor_bens`) com uma competência, e o cronograma recalcula
dali para frente — **prospectivamente**, como manda o CPC 27 (não mexe no
passado já depreciado).

| Evento | `valor` significa | Efeito |
|---|---|---|
| Acréscimo / benfeitoria | quanto foi acrescido | entra no valor contábil e deprecia no tempo restante |
| Reavaliação | o **novo** valor contábil | o bem passa a valer isso; pode redefinir a vida útil |
| Impairment | quanto reduzir | baixa o contábil ao valor recuperável (nunca abaixo do residual) |
| Baixa parcial | quanto do contábil sai | reduz o valor e o residual na mesma proporção |

A quota de cada mês passa a ser **o que falta depreciar sobre os meses que
restam**. Para bem com evento, o restante deprecia em **linha reta** mesmo
que a regra fosse outro método — não há tratamento padrão para misturar soma
dos dígitos com reavaliação no meio da vida. Bem **sem** evento segue o
cálculo normal, inclusive soma dos dígitos e unidades produzidas, intacto.

Peças: `.../Models/EventoValorBem.php`, `.../Enums/TipoEventoValorEnum.php`,
`.../Services/EventoValorBemService.php`, integração em
`CronogramaDepreciacaoService::montarParcelasComEventos()`. API:
`GET|POST /api/v1/bens/{bem}/eventos-valor`, `DELETE .../{evento}`. Tela: na
memória de cálculo do bem. Testes: `EventosValorDepreciacaoTest` (motor) e
`EventosValorApiTest`.

## 9. Limites conhecidos

Fora do escopo desta entrega, em ordem de importância para quem vende o
sistema:

- **CIAP / Bloco G do EFD ICMS/IPI**, créditos de PIS/COFINS, ECD e ECF.
- ~~Reavaliação, impairment, acréscimos/benfeitorias e baixa parcial~~ —
  **resolvido**: ver seção 9 (eventos de valor).
- **Integração contábil**: os campos `conta_contabil` e `centro_custo` já
  existem no bem, mas ainda não há geração de lançamento nem exportação
  contábil por competência.
- **Amortização de intangível** e benfeitoria em imóvel de terceiros.
- ~~A tela de regras não expõe aceleração nem unidades~~ — **resolvido**:
  o modal de regra tem Método de cálculo, Depreciação acelerada (turnos) e
  produção total prevista.
