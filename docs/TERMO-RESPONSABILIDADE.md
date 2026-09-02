# Termo de responsabilidade de bens

Desenho da funcionalidade de entrega de equipamento com assinatura do responsável.
**Nada foi implementado ainda** — este documento é a especificação a ser seguida.

## Problema

Ao entregar um equipamento a um voluntário ou colaborador, a igreja precisa de um
documento assinado em que a pessoa declara ter recebido o bem e conhece as regras e
responsabilidades. Hoje o sistema registra o vínculo bem↔responsável, mas não emite nem
guarda esse documento.

## Decisões tomadas

| Questão | Decisão |
|---|---|
| Escopo do termo | **Vários bens por termo** — uma entrega com notebook, mouse e headset gera um documento só |
| Assinatura | **Online no sistema, com papel como alternativa** |
| Provedor externo (ICP-Brasil) | Fora de escopo — desproporcional para entrega interna e tem custo por documento |

## O que já existe e será reaproveitado

| Peça | Onde |
|---|---|
| Vínculo bem↔responsável | `responsabilidade_bens` (bem, responsável, filial, `data_inicio`, `data_fim`) |
| Cadastro do responsável | `responsaveis` (nome, matrícula, CPF, e-mail, telefone, cargo, departamento) |
| Geração de PDF | dompdf via `Pdf::loadView`, template em `resources/views/reports/pdf/` |
| Rota pública sem login | `/patrimonio/consulta` — precedente para a página de assinatura |
| Anexo de documento | `bem_patrimonial_documentos`, hoje usado para nota fiscal |
| Convenção de permissão | `recurso.acao`, ex.: `bens.criar` |

## Validade jurídica

Não é parecer jurídico — **precisa ser validado por quem responde pelo jurídico da igreja.**

O que a lei diz: a MP 2.200-2/2001, art. 10, §2º, admite documento assinado por outros
meios de comprovação de autoria e integridade **desde que as partes aceitem como válido**.
A Lei 14.063/2020 classifica as assinaturas em simples, avançada e qualificada.

Consequência prática para o desenho: **o texto do termo deve conter cláusula em que o
signatário aceita expressamente a forma eletrônica.** Sem isso, a assinatura simples perde
o principal apoio legal. Por isso o modelo padrão já nasce com essa cláusula.

E é por isso que o sistema grava, junto da assinatura, os elementos que comprovam autoria e
integridade: data e hora, IP, navegador e hash do PDF.

## Modelo de dados

### `termos_modelos` — o texto das regras

Versionado por empresa. Versionar é obrigatório: se a regra mudar em 2027, o termo assinado
em 2026 tem que continuar exibindo o texto de 2026.

| Campo | Tipo | Observação |
|---|---|---|
| `empresa_id` | FK | multiempresa |
| `titulo` | string | |
| `conteudo` | text | as regras e responsabilidades |
| `versao` | int | incrementa a cada alteração |
| `ativo` | bool | um ativo por empresa |

### `termos_responsabilidade` — o termo emitido

| Campo | Tipo | Observação |
|---|---|---|
| `empresa_id`, `filial_id` | FK | escopo |
| `responsavel_id` | FK | quem assina |
| `termo_modelo_id` | FK nullable | referência ao modelo usado |
| `numero` | string | ex.: `TR-2026-000001`, único por empresa |
| `tipo` | string | `entrega` ou `devolucao` |
| `titulo_snapshot` | string | **cópia** do título vigente |
| `conteudo_snapshot` | text | **cópia** do texto vigente, não referência |
| `status` | string | `pendente`, `assinado`, `recusado`, `cancelado` |
| `token` | string único | usado no link público de assinatura |
| `token_expira_em` | datetime | link com prazo |
| `assinatura_metodo` | string nullable | `online` ou `manual` |
| `assinatura_imagem_path` | string nullable | traçado da assinatura |
| `assinado_em` | datetime nullable | |
| `assinatura_ip` | string nullable | comprovação de autoria |
| `assinatura_user_agent` | string nullable | comprovação de autoria |
| `documento_pdf_path` | string nullable | PDF final |
| `documento_hash` | string nullable | SHA-256, comprovação de integridade |
| `observacoes` | text nullable | |

### `termo_responsabilidade_itens` — os bens entregues

| Campo | Tipo | Observação |
|---|---|---|
| `termo_responsabilidade_id` | FK cascade | |
| `bem_patrimonial_id` | FK | |
| `responsabilidade_bem_id` | FK nullable | vínculo criado na assinatura |
| `descricao_snapshot` | string | preserva o que foi entregue |
| `plaqueta_snapshot` | string nullable | |

O uso de *snapshot* no termo e nos itens é deliberado: um documento assinado não pode mudar
de conteúdo porque alguém editou o cadastro do bem depois.

## Fluxo

1. Secretaria abre **Termos de Responsabilidade → Novo**
2. Escolhe o responsável, marca os bens da entrega e o tipo (`entrega`)
3. Sistema cria o termo com cópia do modelo ativo, gera número e token, status `pendente`
4. A partir daí, dois caminhos:

**Online (principal)**
5. A tela mostra um **QR Code** e o link. O responsável abre no próprio celular
6. `/termo/[token]` exibe o texto e os bens, sem exigir login
7. A pessoa assina com o dedo na tela e confirma
8. Sistema grava assinatura, data/hora, IP e navegador; gera o PDF final; calcula o hash;
   status vai para `assinado`; cria o vínculo em `responsabilidade_bens` com `data_inicio`

**Manual (alternativa)**
5. Secretaria baixa o PDF, imprime e colhe a assinatura no papel
6. Digitaliza e anexa ao termo; status `assinado`, método `manual`

**Devolução**
Termo do tipo `devolucao` encerra o vínculo, preenchendo `data_fim` em `responsabilidade_bens`.

## O que construir

### Backend
- 3 migrations (`termos_modelos`, `termos_responsabilidade`, `termo_responsabilidade_itens`)
- Models e relacionamentos
- `TermoModeloController` (CRUD) e `TermoResponsabilidadeController` (CRUD, emitir, anexar assinado)
- Rotas públicas: `GET /api/v1/publico/termos/{token}` e `POST /api/v1/publico/termos/{token}/assinar`
- Template Blade do termo e serviço de geração de PDF com hash
- Permissões `termos.visualizar`, `termos.criar`, `termos.atualizar`, `termos.excluir`
- Seeder com o modelo padrão, já incluindo a cláusula de aceite da forma eletrônica

### Frontend
- Módulo **Termos de Responsabilidade** no menu: listar, emitir, ver, imprimir, anexar digitalizado
- Página pública `/termo/[token]` com área de assinatura em canvas, responsiva para celular
- Tela de edição do modelo de termo

## Fora da Fase 1

**Envio do link por e-mail.** O ambiente está com `MAIL_MAILER=log` e remetente de exemplo —
não há SMTP configurado. Na Fase 1 o link é entregue por QR Code na tela, que atende o
balcão de entrega. O envio por e-mail entra quando o SMTP for definido.

Também ficam para depois: assinatura de testemunha ou gestor, lembrete automático de termo
pendente e relatório de bens sem termo assinado.
