# CHECKLIST DE HOMOLOGAÇÃO — NWB ASSET (STABILIZATION 2026-03-26)

## Escopo desta homologação
- Backend branch: `stabilization/homologacao-2026-03-26`
- Frontend branch: `stabilization/homologacao-2026-03-26`
- Objetivo: validar estabilidade geral, fluxo multiempresa e evolução de depreciação sem quebra de compatibilidade.

## 1. Pré-requisitos do ambiente
- [ ] PostgreSQL ativo e acessível com o banco `nwbasset`.
- [ ] Backend configurado com `.env` válido.
- [ ] Frontend configurado para consumir backend em `http://127.0.0.1:5000`.
- [ ] Dependências instaladas:
  - [ ] `backend`: `php composer.phar install`
  - [ ] `frontend-web`: `npm ci`

## 2. Preparação técnica obrigatória
- [ ] Executar migrações: `php artisan migrate --force`
- [ ] Limpar cache Laravel: `php artisan optimize:clear`
- [ ] Rodar testes backend: `php artisan test`
- [ ] Build frontend: `npm run build`
- [ ] Subir serviços:
  - [ ] Backend: `php artisan serve --host=127.0.0.1 --port=5000`
  - [ ] Frontend: `npm run dev`

## 3. Smoke test inicial
- [ ] `http://localhost:5001/login` abre sem erro.
- [ ] Login com usuário válido funciona.
- [ ] Tela de seleção de empresa abre após login.
- [ ] Dashboard abre sem erro de API ou hidratação.
- [ ] Troca de empresa atualiza dados sem travar a navegação.

## 4. Roteiro por módulo (Sidebar)

### 4.1 Painel de Controle
- [ ] KPIs carregam sem erro.
- [ ] Dados refletem a empresa ativa selecionada.
- [ ] Gráficos carregam sem quebra visual.

### 4.2 Empresas
- [ ] Listagem abre sem erro 401/500.
- [ ] Cadastro manual funciona.
- [ ] Consulta por CNPJ preenche dados quando disponível.
- [ ] Visualizar, editar e excluir funcionam.
- [ ] Upload de logo da empresa funciona.

### 4.3 Filiais
- [ ] Cadastro de filial funciona para empresa ativa.
- [ ] Filial matriz é exibida corretamente.
- [ ] Código de cadastro segue padrão esperado.
- [ ] Visualizar e editar mostram dados completos.

### 4.4 Unidades Administrativas
- [ ] CRUD completo funcionando.
- [ ] Vínculo com empresa/filial correto.

### 4.5 Bens Patrimoniais
- [ ] Cadastro em etapas funciona.
- [ ] Upload de imagens funciona.
- [ ] Upload de nota fiscal (PDF/XML) funciona.
- [ ] Visualização de anexos funciona no modal.
- [ ] Edição e exclusão de bem funcionam.

### 4.6 Plaquetas / QR Code
- [ ] Cadastro manual de etiqueta impressa funciona.
- [ ] Leitura por câmera preenche código de barras.
- [ ] Associação da plaqueta ao bem funciona.
- [ ] Modelo visual da etiqueta renderiza sem logo quebrado.

### 4.7 Inventários
- [ ] CRUD básico abre sem erros.
- [ ] Itens de inventário vinculam bens corretamente.
- [ ] Status do inventário muda conforme fluxo.

### 4.8 Locais
- [ ] Textos e acentuação exibidos em PT-BR.
- [ ] CRUD de local funciona sem erro.
- [ ] Vínculo com filial/unidade/departamento correto.

### 4.9 Departamentos
- [ ] CRUD funcionando.
- [ ] Vínculo organizacional correto.

### 4.10 Responsáveis
- [ ] CRUD funcionando.
- [ ] Vínculo com empresa ativa respeitado.

### 4.11 Transferências
- [ ] Transferência de bem entre estruturas funciona.
- [ ] Histórico registra movimentação.

### 4.12 Baixas Patrimoniais
- [ ] Cadastro de baixa funciona.
- [ ] Motivo de baixa funciona em padrão selecionável.

### 4.13 Responsabilidade de Bens
- [ ] Vínculo de bem-responsável funciona.
- [ ] Alterações refletem no histórico.

### 4.14 Histórico de Localização
- [ ] Listagem de histórico abre sem erro.
- [ ] Registros mostram origem/destino e data.

### 4.15 Depreciações (motor evoluído)
- [ ] Tela unificada abre sem erro.
- [ ] Cadastro de regra por tipo de bem funciona.
- [ ] Tipo de bem vem de tabela (sem texto livre).
- [ ] Campo taxa automática respeita `100 / vida útil`.
- [ ] Terreno pode ser marcado como não depreciável.
- [ ] Edição e exclusão de regra funcionam.
- [ ] Regras legadas continuam atendendo endpoints antigos.

## 5. Multiempresa e permissões
- [ ] Usuário comum vê apenas empresas permitidas.
- [ ] Admin global vê todas as empresas permitidas ao perfil.
- [ ] Dados de módulos respeitam empresa ativa.
- [ ] Troca de empresa reflete no topo e nos dados.
- [ ] Rotas sem permissão retornam bloqueio esperado.

## 6. Regressão técnica obrigatória
- [ ] Sem erro `Undefined table` durante navegação.
- [ ] Sem erro de chunk/hydration no frontend.
- [ ] Sem erro de encoding estranho em textos.
- [ ] Sem erro 500 nas rotas principais (`users`, `dashboard`, `depreciações`, `locais`, `plaquetas`).

## 7. Evidências da homologação
- [ ] Captura de tela da execução dos testes (`php artisan test`).
- [ ] Captura de tela do build frontend (`npm run build`).
- [ ] Captura de tela de cada módulo homologado.
- [ ] Registro de usuário testado e empresa ativa.
- [ ] Data/hora da homologação e responsável.

## 8. Critérios de aceite final
- [ ] Todos os itens críticos marcados como OK.
- [ ] Nenhum erro bloqueante aberto.
- [ ] Fluxo login → selecionar empresa → operar módulos validado.
- [ ] Depreciação nova funcionando com retrocompatibilidade.
- [ ] Aprovado para seguir para UAT/produção.
