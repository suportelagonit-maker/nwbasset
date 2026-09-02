# MANUAL DE MENUS DO SIDEBAR — NWB ASSET

## Objetivo
Este documento descreve cada menu lateral do NWB Asset:
- para que serve;
- o que faz no sistema;
- como usar dentro do processo de inventário patrimonial.

## Regras de visibilidade dos menus
- O menu **Empresas** aparece para perfil com visão de gestão global (ex.: super admin/master).
- Usuário comum (empresa única) normalmente não vê gestão global de empresas; opera nos menus da própria empresa.
- Todos os módulos operacionais (bens, inventário, plaquetas, locais etc.) trabalham no **contexto da empresa ativa** selecionada no topo.

## Fluxo recomendado de inventário (resumo)
1. Estruturar base organizacional: **Filiais**, **Unidades Administrativas**, **Departamentos**, **Locais**, **Responsáveis**.
2. Cadastrar ativos em **Bens Patrimoniais**.
3. Vincular etiqueta física em **Plaquetas / QR Code**.
4. Abrir e executar contagem em **Inventários**.
5. Tratar inconsistências em **Divergências** e consolidar em **Conciliações**.
6. Emitir resultado em **Relatórios** e **Exportações**.
7. Validar rastreabilidade em **Auditorias** e histórico.

---

## Menus do Sidebar (descrição completa)

## 1) Painel de Controle
- **Para que serve:** visão executiva da empresa ativa (ou visão geral, quando permitido).
- **O que faz:** mostra indicadores (quantidade de bens, valores, depreciação, pendências, gráficos).
- **No inventário:** acompanha evolução da contagem, impacto das divergências e situação patrimonial consolidada.

## 2) Empresas
- **Para que serve:** cadastro e gestão das empresas clientes do ambiente.
- **O que faz:** cria/edita empresa, dados cadastrais, contexto multiempresa e logo institucional.
- **No inventário:** define o “dono” dos bens e separa os inventários por empresa.
- **Observação:** normalmente visível apenas para perfil master/global.

## 3) Filiais
- **Para que serve:** organizar unidades físicas da empresa (matriz e filiais).
- **O que faz:** cadastra filiais e estrutura hierárquica para alocação patrimonial.
- **No inventário:** permite inventariar por filial, separando contagem e responsabilidade por unidade.

## 4) Unidades Administrativas
- **Para que serve:** segmentar a estrutura administrativa da filial.
- **O que faz:** cadastra unidades (ex.: Administração, TI, Operações, Financeiro).
- **No inventário:** ajuda a distribuir e consolidar contagem por unidade administrativa.

## 5) Bens Patrimoniais
- **Para que serve:** cadastro central dos ativos.
- **O que faz:** registra tombo, descrição, classificação, estado, valor, vida útil, vínculos organizacionais e anexos.
- **No inventário:** é a base principal; cada item inventariado deve existir aqui para conciliação correta.

## 6) Plaquetas / QR Code
- **Para que serve:** identificação física dos bens.
- **O que faz:** cadastra/gera plaquetas, controla código de barras/QR e vínculo com o bem patrimonial.
- **No inventário:** habilita leitura rápida por câmera/coletor para localizar item e confirmar presença.

## 7) Inventários
- **Para que serve:** execução do inventário patrimonial.
- **O que faz:** cria inventário, carrega itens da empresa, permite conferência de localização e status do bem.
- **No inventário:** é o módulo operacional principal da contagem física.

## 8) Locais
- **Para que serve:** mapear locais físicos onde os bens ficam alocados.
- **O que faz:** cadastra salas, setores, prédios e endereços internos.
- **No inventário:** valida se o bem está no local correto e facilita apontar divergência de localização.

## 9) Departamentos
- **Para que serve:** classificar bens por área organizacional.
- **O que faz:** cadastra departamentos vinculados à estrutura.
- **No inventário:** permite análise de cobertura e divergências por departamento.

## 10) Responsáveis
- **Para que serve:** definir responsável por guarda/uso do ativo.
- **O que faz:** cadastra e vincula responsável aos bens.
- **No inventário:** permite validar “responsável esperado x responsável encontrado”.

## 11) Transferências
- **Para que serve:** formalizar movimentação de bens.
- **O que faz:** registra transferência entre filial/unidade/departamento/local/responsável.
- **No inventário:** reduz divergências quando mudanças reais são registradas antes da contagem.

## 12) Baixas Patrimoniais
- **Para que serve:** retirar bens do ativo de forma auditável.
- **O que faz:** baixa por motivo (descarte, perda, sinistro, obsolescência etc.) com rastreabilidade.
- **No inventário:** evita contar itens que já deveriam estar fora da base ativa.

## 13) Responsabilidade de Bens
- **Para que serve:** histórico de posse/guarda do ativo.
- **O que faz:** guarda trilha de mudança de responsável e contexto da atribuição.
- **No inventário:** apoia auditoria de divergências de responsável.

## 14) Histórico de Localização
- **Para que serve:** rastrear deslocamento físico do bem ao longo do tempo.
- **O que faz:** registra histórico de localizações e alterações.
- **No inventário:** comprova se o item foi movido e quando isso ocorreu.

## 15) Métodos de Depreciação
- **Para que serve:** manter métodos de cálculo contábil.
- **O que faz:** cadastra métodos (ex.: linha reta) usados no cálculo da depreciação.
- **No inventário:** influencia valor contábil apresentado em relatórios e reconciliações.

## 16) Parâmetros de Depreciação
- **Para que serve:** definir parâmetros padrão por empresa.
- **O que faz:** configura vida útil e taxa depreciação padrão por contexto.
- **No inventário:** garante consistência dos valores dos ativos avaliados.

## 17) Depreciações
- **Para que serve:** registrar e acompanhar cálculo depreciação dos bens.
- **O que faz:** mantém valor depreciado acumulado e valor contábil.
- **No inventário:** suporta avaliação financeira dos itens inventariados.

## 18) Conciliações
- **Para que serve:** consolidar resultado da contagem.
- **O que faz:** compara bens do sistema versus bens encontrados.
- **No inventário:** fecha o ciclo operacional com diagnóstico final de aderência.

## 19) Divergências
- **Para que serve:** tratar inconsistências detectadas.
- **O que faz:** registra casos como não encontrado, local diferente, responsável diferente, sem tombo.
- **No inventário:** direciona plano de ação corretiva e ajustes cadastrais.

## 20) Relatórios
- **Para que serve:** análise operacional e gerencial.
- **O que faz:** gera relatórios por local, responsável, depreciação, inventário e divergências.
- **No inventário:** entrega visão final para gestão e auditoria.

## 21) Exportações
- **Para que serve:** saída de dados para compartilhamento externo.
- **O que faz:** exporta relatórios em PDF, Excel e CSV.
- **No inventário:** permite envio para diretoria, contabilidade e auditoria externa.

## 22) Auditorias
- **Para que serve:** rastreabilidade e conformidade.
- **O que faz:** registra trilhas operacionais e eventos patrimoniais críticos.
- **No inventário:** garante prova de execução, mudanças e responsáveis por ação.

## 23) Usuários
- **Para que serve:** gestão de acesso ao sistema.
- **O que faz:** cria/edita usuários, ativa/inativa contas e vincula ao contexto da empresa.
- **No inventário:** define quem pode executar contagem, validar divergência e aprovar ações.

## 24) Permissões
- **Para que serve:** controle de autorização por papel (role).
- **O que faz:** configura o que cada perfil pode visualizar/editar/excluir.
- **No inventário:** separa função operacional (coletar), gestor (validar) e admin (governança).

## 25) Perfil
- **Para que serve:** dados do usuário autenticado.
- **O que faz:** exibe informações da sessão, perfil e contexto atual.
- **No inventário:** confirma rapidamente “quem está executando” ações sensíveis.

---

## Como usar na prática (roteiro rápido)
- **Antes do inventário:** Filiais → Unidades Administrativas → Departamentos → Locais → Responsáveis → Bens Patrimoniais → Plaquetas.
- **Durante o inventário:** Inventários → leitura da plaqueta/QR → marcação de localizado/não localizado → registro de divergências.
- **Depois do inventário:** Conciliações → Relatórios → Exportações → Auditorias.

## Resultado esperado
Com esse fluxo, o sistema mantém:
- separação por empresa;
- rastreabilidade completa do bem;
- inventário auditável ponta a ponta.

