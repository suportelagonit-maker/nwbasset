# Fiscal — CIAP e os limites do SPED

O que o módulo faz na parte fiscal, e — igualmente importante — o que
**não** faz e por quê.

## 1. CIAP (crédito de ICMS do ativo)

**O que é:** para empresa contribuinte de ICMS, o imposto pago na compra de
um bem do ativo imobilizado pode ser creditado em **48 parcelas mensais**
(1/48 ao mês), cada uma multiplicada pelo **fator de proporcionalidade** do
mês (saídas tributadas ÷ saídas totais). É a regra da LC 87/1996 (art. 20,
§5º) e a base do **Bloco G** do EFD ICMS/IPI.

**O que o sistema faz:**
- No bem, informa-se o crédito de ICMS e o mês inicial. Só o bem com crédito
  informado entra no CIAP.
- O sistema gera o **cronograma de 48 parcelas** (1/48 × fator), com saldo a
  apropriar por mês.
- O **fator por competência** é informado por empresa (saídas tributadas e
  totais → fator). Sem registro para o mês, assume-se 1,0.
- A **apuração consolidada** de uma competência soma a parcela de todos os
  bens — é a **conferência** do que iria para os registros G125 do Bloco G.

Peças: `CiapService`, `CiapController`, `CiapFator`, campos
`valor_credito_icms`/`data_credito_icms` no bem. API: `GET|PUT
/api/v1/bens/{bem}/ciap`, `GET /api/v1/ciap/apuracao`, `PUT
/api/v1/ciap/fatores`. Testes: `CiapTest`.

## 2. O que NÃO foi gerado, e por quê

**A geração do arquivo SPED validado (EFD ICMS/IPI Bloco G, ECD, ECF) não
foi feita — de propósito.** Não é lacuna de engenharia; é que esses arquivos
são **obrigações legais com formato definido pela Receita/Sefaz** e não podem
ser gerados "no escuro":

- O **leiaute muda a cada ano** e é validado pelo programa oficial (PVA). Um
  arquivo gerado sem validar contra o PVA vigente é rejeitado — ou, pior,
  aceito com erro.
- Dependem do **regime tributário** da empresa (Lucro Real, Presumido,
  Simples, imune/isento), do **plano de contas** e do mapeamento contábil
  específico — informação que é do cliente e do contador dele.
- Gerar e entregar um arquivo fiscal errado cria **risco legal** para o
  cliente.

Por isso o sistema entrega o **controle e a conferência** (o cronograma
CIAP, a apuração mensal), que são a parte correta e reutilizável, e deixa a
**emissão do arquivo** como um passo feito **com o contador**, a partir
desses dados. É a prática de qualquer sistema sério: o software calcula, o
contador valida e transmite.

## 3. Aplicabilidade ao cliente atual

A empresa em produção é a **IGREJA NOVOS COMEÇOS** — organização religiosa.
Templos são **imunes a impostos** (CF, art. 150, VI, "b") e **não têm
operação de ICMS**. Na prática:

- **CIAP / Bloco G: não se aplica** (não há ICMS a creditar).
- **ECF / tabela fiscal de depreciação (IRPJ): não se aplica** (não há IRPJ
  a apurar).
- A depreciação que importa para a igreja é a **societária/patrimonial**
  (CPC 27), para o controle do patrimônio — que o módulo já faz.

O CIAP foi construído pensando em **clientes futuros contribuintes de ICMS**
(Lucro Real/Presumido), para os quais ele é relevante. Para a igreja, o
controle fica inativo (nenhum bem tem crédito informado) e não atrapalha.

## 4. Resumo honesto do "Bloco D"

| Item | Situação |
|---|---|
| CIAP (controle 1/48 + fator + apuração) | **Feito e testado** — opt-in, para contribuinte de ICMS |
| Bloco G (arquivo EFD ICMS/IPI) | A conferência existe; o **arquivo validado** é passo com o contador |
| PIS/COFINS sobre o ativo | Fora — depende do regime e do enquadramento |
| ECD / ECF (arquivos SPED) | Fora — obrigações com leiaute oficial, exigem regime + plano de contas + validação PVA do contador |

Recomendação: ativar a geração de arquivos SPED só quando houver um cliente
contribuinte real, com o contador dele definindo regime, plano de contas e
conferindo contra o PVA. Até lá, o sistema entrega o cálculo e a
conferência, que é onde o software agrega valor sem assumir risco fiscal.
