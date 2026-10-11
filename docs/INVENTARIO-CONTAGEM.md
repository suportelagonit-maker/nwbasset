# Contagem de inventário em campo

A tela que faltava para o inventário existir de verdade: antes havia a API
de itens, a conciliação e as divergências, mas **nenhuma interface para
marcar um bem como encontrado** — qualquer inventário fechava com "0
encontrados, tudo divergente".

Escrito para quem for mexer nisso depois.

## 1. Como funciona

Criado o inventário, o sistema monta a lista do que tem de ser contado
(`inventario_itens`). Em campo, o operador abre a contagem no celular,
escolhe o local onde está e lê as etiquetas uma atrás da outra.

Cada leitura recebe um veredito imediato:

| Resultado | Quando acontece |
|---|---|
| `CONTADO` | Bem do inventário, marcado como encontrado |
| `LOCAL_DIFERENTE` | Contado, mas o local lido difere do cadastro |
| `JA_CONTADO` | Já tinha sido contado nesta mesma contagem |
| `FORA_DO_INVENTARIO` | A etiqueta é de um bem que não está nesta lista |
| `NAO_IDENTIFICADO` | Nenhum bem corresponde ao código |

O código lido é resolvido primeiro pela plaqueta (código de barras, QR ou o
link de consulta do QR) e depois pelo número do tombo ou de série digitado
à mão — etiqueta rasgada não pode parar a contagem.

## 2. A fila offline

Inventário acontece em almoxarifado, subsolo e galpão. Se a leitura
dependesse da rede, o operador teria de parar — e contagem interrompida é
contagem refeita.

Toda leitura entra primeiro numa fila local (IndexedDB, em
`frontend-web/lib/fila-contagem.ts`) e só depois vai ao servidor. A tela
mostra quantas estão aguardando e avisa quando está sem rede; ao voltar o
sinal, a fila sobe sozinha.

**Por que IndexedDB e não localStorage:** a fila pode ter milhares de
leituras e precisa sobreviver ao navegador ser fechado no meio do caminho.

**Por que cada leitura leva um `origem_id` gerado no aparelho:** se a rede
cair no meio do envio, o aparelho reenvia a fila inteira. O servidor
reconhece o que já recebeu e devolve o veredito antigo, sem contar nada
duas vezes — o operador não precisa saber o que chegou e o que não chegou.

**A trava do envio é um `ref`, não estado.** Com leituras em sequência
rápida, o estado `enviando` chega tarde e uma leitura ficava presa na fila
até a leitura seguinte. O envio também esvazia a fila em laço, não só o
primeiro lote: o que entrou enquanto o envio corria sobe na mesma rodada.

## 3. Nada se perde

Leitura que não casa com bem nenhum **também é gravada**
(`inventario_leituras`). É ela que vira o achado "existe fisicamente e não
está no cadastro" — justamente o que o inventário existe para descobrir.
Sem esse registro a pessoa lê, o sistema diz "não encontrei" e a informação
some.

## 4. Conciliação

Ao finalizar, a conciliação compara o que foi contado com a lista e gera as
divergências:

- **Não encontrado** — item que ninguém leu;
- **Local diferente** — lido em local diferente do cadastro (novo nesta
  entrega: antes a divergência de localização nunca era gerada, porque não
  havia onde registrar o local encontrado);
- **Sem tombo** — bem sem número de tombo.

## 5. Corrigido junto

- **Inventário de filial carregava os bens da empresa inteira.** Contar a
  filial A fazia os bens da filial B aparecerem como "não encontrados", e
  toda conciliação virava uma lista de falsas divergências.
- **Bem já baixado entrava na lista** e nunca seria encontrado.

## 6. As peças

| Peça | Arquivo |
|---|---|
| Regras da contagem | `backend/app/Domain/Inventory/Services/ContagemInventarioService.php` |
| Vereditos | `backend/app/Domain/Inventory/Enums/ResultadoLeituraEnum.php` |
| API | `backend/app/Domain/Inventory/Controllers/ContagemInventarioController.php` |
| Fila local | `frontend-web/lib/fila-contagem.ts` |
| Tela de campo | `frontend-web/components/ContagemInventario.tsx` |
| Testes | `backend/tests/Feature/ContagemInventarioTest.php` |

Endpoints: `GET /api/v1/inventarios/{inventario}/contagem`,
`POST .../leituras`, `POST .../finalizar`.

## 7. Inventário rotativo

Contar a filial inteira de uma vez só funciona em empresa pequena. A
prática do mercado é o rotativo: percorrer alguns locais por mês até fechar
o ciclo.

Na tela de contagem, enquanto **nada foi contado ainda**, há a seção
"Contar só alguns locais". Escolhidos os locais, a lista é refeita e só os
bens daqueles locais entram — o resto não vira divergência.

Trocar o escopo **depois da primeira leitura é recusado**: refazer a lista
apagaria contagem já feita, e contagem apagada é trabalho de campo perdido.
Nesse caso o caminho é criar outro inventário.

Inventário sem local escolhido continua completo (`tipo = COMPLETO`), que
é o comportamento de antes.

## 8. Conferência de responsável

Além de "onde você está contando", a tela pergunta o **responsável
conferido**. Quando informado e diferente do cadastro, a leitura responde
"Contado, mas com responsável diferente do cadastro" e a conciliação gera a
divergência `RESPONSAVEL_DIFERENTE`.

Quando local **e** responsável divergem, o aviso na tela mostra o local — é
o sinal mais forte para quem está em campo —, mas a conciliação aponta as
duas divergências.

## 9. Leitura por aproximação (NFC)

Botão "Ler por aproximação", em `frontend-web/lib/leitura-nfc.ts`. Usa a
Web NFC, hoje disponível só no **Chrome para Android**: o aparelho encosta
na etiqueta NFC/NTAG e lê, sem precisar enquadrar o código de barras. Em
navegador sem suporte o botão simplesmente não aparece.

Lê o texto ou a URL gravada na etiqueta e, se ela estiver vazia, o número
de série — que serve se tiver sido cadastrado como código da plaqueta.

**O que isto não é:** leitura de **RFID UHF**, aquela de portal e de
pistola que lê dezenas de etiquetas a metros de distância. UHF depende de
hardware dedicado e de um protocolo que o navegador não alcança; seria
integração à parte, com o coletor do fabricante.

## 10. Limites conhecidos

- **RFID UHF** continua fora (ver seção 9).
- A lista de pendentes é paginada de 50 em 50, com "ver mais"; não há busca
  por tombo dentro dela.
- O escopo rotativo é por **local**; não dá para montar um ciclo por
  departamento ou por responsável.
- A leitura por NFC foi implementada, mas **não foi testada em aparelho
  Android real** — só o caminho de ausência de suporte foi verificado.
