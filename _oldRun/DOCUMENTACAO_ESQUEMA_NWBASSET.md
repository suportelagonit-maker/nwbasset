# ESQUEMA COMPLETO DO SISTEMA - NWB Asset

Documento consolidado do estado atual do projeto `NWB Asset`, com foco em arquitetura, tecnologias, usuarios, funcionalidades, modulos, rotas, tabelas e migrations.

## 1. Visao Geral

O NWB Asset e um ERP patrimonial multiempresa para gestao de ativos imobilizados tangiveis.

O sistema esta dividido em tres camadas principais:

- backend em Laravel
- frontend web em Next.js
- app mobile em React Native + Expo

Objetivos principais do sistema:

- controle patrimonial multiempresa
- cadastro e rastreabilidade de bens
- movimentacao patrimonial auditavel
- inventario fisico com divergencias
- depreciacao patrimonial
- relatorios, exportacoes e dashboard
- leitura de QR Code no mobile

## 2. Tecnologias Utilizadas

### 2.1 Banco de Dados

- banco: `PostgreSQL`
- database atual: `nwbasset`
- uso principal:
- persistencia dos dados operacionais
- autenticacao e acesso
- estruturas patrimoniais
- inventario
- depreciacao
- auditoria
- dashboard e relatorios

### 2.2 Linguagens de Programacao

- `PHP`
- usada no backend Laravel
- usada em controllers, models, services, actions, requests, resources, policies, middlewares, seeders e migrations

- `TypeScript`
- usada no frontend web em Next.js
- usada no app mobile em React Native / Expo
- usada em componentes, telas, hooks, servicos e proxies da API

- `SQL`
- usada no PostgreSQL via migrations, constraints, indices e consultas otimizadas

### 2.3 Frameworks e Bibliotecas Principais

#### Backend

- `Laravel 12`
- usado como framework principal da API REST
- responsavel por autenticacao, autorizacao, rotas, controllers, requests, resources, Eloquent ORM, migrations e seeders

- `Laravel Sanctum`
- usado para autenticacao por token

- `Eloquent ORM`
- usado para relacionamento entre models e persistencia no PostgreSQL

- `Barryvdh DomPDF`
- usado para exportacao PDF

- `OpenSpout`
- usado para exportacao Excel

#### Frontend Web

- `Next.js 16`
- usado no painel administrativo web
- responsavel pelas rotas, layouts, paginas e proxies internos

- `React`
- usado na composicao da interface e dos componentes

- `Tailwind CSS` e estilos utilitarios
- usados no layout administrativo, dashboard, formularios e telas de gestao

#### Mobile

- `React Native`
- usado no app mobile de inventario

- `Expo`
- usado na execucao do app, empacotamento e recursos nativos

### 2.4 Onde Cada Tecnologia e Usada

#### Backend

- caminho principal: `C:\Sistema\nwbasset\backend`
- stack: `PHP + Laravel 12 + PostgreSQL`
- uso:
- regras de negocio
- autenticacao multiempresa
- autorizacao por role e permissao
- API REST
- inventario, depreciacao, bens, movimentacoes, auditoria e exportacoes

#### Frontend Web

- caminho principal: `C:\Sistema\nwbasset\frontend-web`
- stack: `Next.js + React + TypeScript`
- uso:
- painel administrativo
- dashboard patrimonial
- login web
- telas de usuarios, permissoes, perfil e empresas
- consumo da API do Laravel

#### Mobile

- caminho principal: `C:\Sistema\nwbasset\frontend-mobile`
- stack: `React Native + Expo + TypeScript`
- uso:
- inventario patrimonial em campo
- leitura de QR Code
- confirmacao de bens
- divergencias
- sincronizacao com a API

#### Banco de Dados

- tecnologia: `PostgreSQL`
- database: `nwbasset`
- uso:
- armazenamento central do sistema
- integridade referencial
- controle multiempresa
- historico e auditoria

### 2.5 Resumo Executivo da Arquitetura

- `Back End`: Laravel 12 em PHP
- `Front End Web`: Next.js em React + TypeScript
- `Mobile`: React Native + Expo
- `Banco de Dados`: PostgreSQL
- `Autenticacao`: Laravel Sanctum
- `Padrao`: API REST + arquitetura por dominio em `app/Domain`

## 3. Estrutura por Dominio

Pastas de dominio atualmente existentes em `app/Domain`:

- `Accounting`
- `Administration`
- `AssetMovements`
- `AssetRegistry`
- `Assets`
- `AssetValuation`
- `Audit`
- `Auth`
- `Dashboard`
- `Depreciation`
- `Inventory`
- `MultiCompany`
- `Organization`
- `Reconciliation`
- `Reports`
- `Shared`

## 4. Modelo Multiempresa

O sistema foi estruturado para operar com isolamento por empresa.

Regras centrais:

- o contexto ativo de empresa e controlado por middleware
- o backend e a fonte da verdade
- dados operacionais sao filtrados por `empresa_id`
- autenticacao e autorizacao usam empresa + role + permissoes

Camadas relacionadas:

- `app/Http/Middleware/EmpresaContextMiddleware.php`
- `app/Domain/MultiCompany/Services/EmpresaContextService.php`
- `app/Http/Middleware/RolePermissionMiddleware.php`

## 5. Perfis de Usuario

Roles padrao cadastradas:

- `SUPER_ADMIN`
- `ADMIN_EMPRESA`
- `GESTOR_PATRIMONIAL`
- `AUDITOR`
- `OPERADOR_INVENTARIO`

Permissoes ja mapeadas no seed de autenticacao:

- `empresas.visualizar`
- `empresas.criar`
- `empresas.atualizar`
- `empresas.excluir`
- `bens.visualizar`
- `bens.criar`
- `bens.atualizar`
- `bens.excluir`
- `movimentacoes.visualizar`
- `movimentacoes.criar`
- `movimentacoes.atualizar`
- `movimentacoes.excluir`
- `inventarios.visualizar`
- `inventarios.criar`
- `inventarios.atualizar`
- `inventarios.excluir`
- `depreciacoes.visualizar`
- `depreciacoes.criar`
- `depreciacoes.atualizar`
- `depreciacoes.excluir`
- `relatorios.visualizar`
- `dashboard.visualizar`
- `usuarios.visualizar`
- `usuarios.criar`
- `usuarios.atualizar`
- `usuarios.excluir`
- `permissoes.visualizar`

## 6. Funcionalidades Implementadas

### 6.1 Nucleo e Seguranca

- login via API
- logout
- endpoint `auth/me`
- contexto multiempresa
- autorizacao por role/permissao
- CRUD de usuarios
- consulta de permissoes por role

### 6.2 Estrutura Organizacional

- empresas
- unidades administrativas
- departamentos
- locais
- responsaveis

Observacao:

- existe tabela de `filiais`, mas a rota REST de filiais nao esta atualmente exposta em `routes/api.php`

### 6.3 Patrimonio

- cadastro de bens patrimoniais
- associacao com local e responsavel
- plaquetas patrimoniais
- QR Code logico

### 6.4 Movimentacoes

- historico de localizacao
- transferencias
- baixas
- responsabilidade de bens

### 6.5 Depreciacao

- metodos de depreciacao
- parametros de depreciacao
- depreciacoes de bens

### 6.6 Inventario

- inventarios
- itens de inventario
- conciliacoes patrimoniais
- divergencias de inventario

### 6.7 Auditoria, Relatorios e Dashboard

- logs patrimoniais
- auditorias patrimoniais
- relatorios patrimoniais
- exportacao PDF/Excel/CSV
- dashboard patrimonial

## 7. Rotas API Atualmente Expostas

Base: `http://127.0.0.1:5000/api/v1`

### Status

- `GET /status`

### Autenticacao

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### Administracao e Organizacao

- `apiResource /empresas`
- `apiResource /usuarios`
- `GET /roles-permissoes`
- `apiResource /unidades-administrativas`
- `apiResource /departamentos`
- `apiResource /locais`
- `apiResource /responsaveis`

### Patrimonio

- `apiResource /bens`
- `apiResource /plaquetas`

### Movimentacoes

- `apiResource /historico-localizacao-bens`
- `apiResource /transferencias-bens`
- `apiResource /baixas-bens`
- `apiResource /responsabilidade-bens`

### Depreciacao

- `apiResource /metodos-depreciacao`
- `apiResource /parametros-depreciacao`
- `apiResource /depreciacoes`

### Inventario

- `apiResource /inventarios`
- `apiResource /inventario-itens`
- `apiResource /conciliacoes`
- `apiResource /divergencias`

### Auditoria, Relatorios e Exportacoes

- `apiResource /auditorias`
- `GET /relatorios/bens-por-local`
- `GET /relatorios/bens-por-responsavel`
- `GET /relatorios/depreciacao`
- `GET /relatorios/inventario`
- `GET /relatorios/divergencias`
- `GET /exportacoes/bens-por-local/pdf`
- `GET /exportacoes/bens-por-local/excel`
- `GET /exportacoes/bens-por-local/csv`
- `GET /exportacoes/bens-por-responsavel/pdf`
- `GET /exportacoes/depreciacao/pdf`
- `GET /exportacoes/inventario/pdf`
- `GET /exportacoes/divergencias/pdf`

### Dashboard

- `GET /dashboard/patrimonio/resumo`
- `GET /dashboard/patrimonio/bens-por-local`
- `GET /dashboard/patrimonio/bens-por-departamento`
- `GET /dashboard/patrimonio/evolucao-patrimonio`

## 8. Frontend Web Atual

Rotas existentes no app Next.js:

- `/`
- `/login`
- `/perfil`
- `/users`
- `/permissoes`
- `/dashboard/patrimonio`
- `/dashboard/modulos/empresas`
- `/dashboard/modulos/[slug]`

Funcionalidades visiveis no frontend:

- layout administrativo com sidebar
- dashboard patrimonial
- login web
- menu de usuario com perfil e sair
- tela de empresas com:
- consulta manual
- cadastro em popup
- visualizacao
- edicao
- exclusao
- etapa visual para futura integracao com NWB System

## 9. Mobile Atual

Telas implementadas:

- `LoginScreen`
- `InventariosScreen`
- `InventarioExecucaoScreen`
- `ScannerScreen`
- `BemDetalheScreen`
- `RegistrarDivergenciaScreen`

Objetivo do app:

- inventario patrimonial por QR Code
- confirmacao de presenca
- divergencias
- captura de foto
- sincronizacao com API

## 10. Mapa de Tabelas do Banco

### 10.1 Tabelas de Autenticacao e Acesso

#### `usuarios`

- `id`
- `empresa_id`
- `nome`
- `email`
- `password`
- `role`
- `ativo`
- `ultimo_login_em`
- `created_at`
- `updated_at`

#### `roles_permissoes`

- `id`
- `role`
- `permissao`
- `created_at`
- `updated_at`

#### `perfis`

- `id`
- `nome`
- `descricao`

#### `permissoes`

- `id`
- `nome`
- `chave`

#### `usuario_empresas`

- `id`
- `usuario_id`
- `empresa_id`
- `perfil`
- `created_at`

#### `perfil_permissoes`

- `id`
- `perfil_id`
- `permissao_id`

### 10.2 Tabelas Organizacionais

#### `empresas`

- `id`
- `razao_social`
- `nome_fantasia`
- `cnpj`
- `inscricao_estadual`
- `email`
- `telefone`
- `status`
- `created_at`
- `updated_at`

#### `filiais`

- `id`
- `empresa_id`
- `nome`
- `codigo`
- `cnpj`
- `endereco`
- `cidade`
- `estado`
- `status`
- `created_at`
- `updated_at`

#### `unidades_administrativas`

- `id`
- `empresa_id`
- `filial_id`
- `nome`
- `codigo`
- `descricao`
- `status`
- `created_at`
- `updated_at`

#### `departamentos`

- `id`
- `empresa_id`
- `filial_id`
- `unidade_administrativa_id`
- `nome`
- `codigo`
- `descricao`
- `status`
- `created_at`
- `updated_at`

#### `locais`

- `id`
- `empresa_id`
- `filial_id`
- `unidade_administrativa_id`
- `departamento_id`
- `nome`
- `codigo`
- `endereco`
- `descricao`
- `status`
- `created_at`
- `updated_at`

#### `responsaveis`

- `id`
- `empresa_id`
- `filial_id`
- `nome`
- `matricula`
- `cpf`
- `email`
- `telefone`
- `cargo`
- `status`
- `created_at`
- `updated_at`

### 10.3 Tabelas Patrimoniais

#### `bens_patrimoniais`

- `id`
- `empresa_id`
- `filial_id`
- `unidade_administrativa_id`
- `departamento_id`
- `local_id`
- `responsavel_id`
- `numero_tombo`
- `numero_serie`
- `descricao`
- `categoria`
- `marca`
- `modelo`
- `data_aquisicao`
- `valor_aquisicao`
- `valor_residual`
- `vida_util_anos`
- `status_bem`
- `estado_conservacao`
- `created_at`
- `updated_at`

#### `plaquetas_patrimoniais`

- `id`
- `bem_patrimonial_id`
- `empresa_id`
- `filial_id`
- `codigo_plaqueta`
- `qr_code_conteudo`
- `status`
- `data_geracao`
- `data_aplicacao`
- `observacoes`
- `created_at`
- `updated_at`

### 10.4 Tabelas de Movimentacao

#### `historico_localizacao_bens`

- `id`
- `bem_patrimonial_id`
- `empresa_id`
- `filial_id`
- `unidade_administrativa_id`
- `departamento_id`
- `local_id`
- `data_inicio`
- `data_fim`
- `observacoes`
- `created_at`
- `updated_at`

#### `transferencias_bens`

- `id`
- `bem_patrimonial_id`
- `empresa_id`
- `filial_id`
- `origem_unidade_administrativa_id`
- `origem_departamento_id`
- `origem_local_id`
- `destino_unidade_administrativa_id`
- `destino_departamento_id`
- `destino_local_id`
- `data_transferencia`
- `motivo`
- `observacoes`
- `created_at`
- `updated_at`

#### `baixas_bens`

- `id`
- `bem_patrimonial_id`
- `empresa_id`
- `filial_id`
- `data_baixa`
- `motivo_baixa`
- `valor_baixa`
- `observacoes`
- `created_at`
- `updated_at`

#### `responsabilidade_bens`

- `id`
- `bem_patrimonial_id`
- `empresa_id`
- `filial_id`
- `responsavel_id`
- `data_inicio`
- `data_fim`
- `observacoes`
- `created_at`
- `updated_at`

### 10.5 Tabelas de Depreciacao

#### `metodos_depreciacao`

- `id`
- `nome`
- `codigo`
- `descricao`
- `created_at`
- `updated_at`

#### `parametros_depreciacao`

- `id`
- `empresa_id`
- `metodo_depreciacao_id`
- `vida_util_padrao`
- `taxa_padrao`
- `created_at`
- `updated_at`

#### `depreciacoes_bens`

- `id`
- `bem_patrimonial_id`
- `empresa_id`
- `metodo_depreciacao_id`
- `valor_aquisicao`
- `valor_residual`
- `vida_util_anos`
- `taxa_anual`
- `valor_depreciado_acumulado`
- `valor_contabil`
- `data_calculo`
- `created_at`
- `updated_at`

### 10.6 Tabelas de Inventario

#### `inventarios`

- `id`
- `empresa_id`
- `filial_id`
- `nome`
- `data_inicio`
- `data_fim`
- `status`
- `created_at`
- `updated_at`

#### `inventario_itens`

- `id`
- `inventario_id`
- `bem_patrimonial_id`
- `localizado`
- `data_verificacao`
- `observacoes`
- `created_at`
- `updated_at`

#### `conciliacoes_patrimoniais`

- `id`
- `inventario_id`
- `total_bens_sistema`
- `total_bens_encontrados`
- `divergencias`
- `data_conciliacao`
- `created_at`
- `updated_at`

#### `divergencias_inventario`

- `id`
- `inventario_id`
- `bem_patrimonial_id`
- `tipo_divergencia`
- `descricao`
- `created_at`
- `updated_at`

### 10.7 Tabelas de Auditoria

#### `logs_operacoes_patrimoniais`

- `id`
- `empresa_id`
- `usuario_id`
- `operacao`
- `entidade`
- `entidade_id`
- `dados_anteriores`
- `dados_novos`
- `created_at`

#### `auditorias_patrimoniais`

- `id`
- `empresa_id`
- `inventario_id`
- `data_auditoria`
- `auditor`
- `observacoes`
- `created_at`
- `updated_at`

### 10.8 Tabelas Tecnicas de Framework

- `personal_access_tokens`
- `cache`
- `jobs`

Observacao:

- algumas migrations do Laravel tambem criam estruturas auxiliares de fila, cache e tokens

## 11. Lista de Migrations

Migrations atualmente presentes:

- `0001_01_01_000001_create_cache_table.php`
- `0001_01_01_000002_create_jobs_table.php`
- `2026_03_13_142651_create_personal_access_tokens_table.php`
- `2026_03_13_150000_create_empresas_table.php`
- `2026_03_13_150100_create_filiais_table.php`
- `2026_03_13_150200_create_usuarios_table.php`
- `2026_03_13_150300_create_perfis_table.php`
- `2026_03_13_150400_create_permissoes_table.php`
- `2026_03_13_150500_create_usuario_empresas_table.php`
- `2026_03_13_150800_create_perfil_permissoes_table.php`
- `2026_03_13_160000_create_unidades_administrativas_table.php`
- `2026_03_13_160100_create_departamentos_table.php`
- `2026_03_13_160200_create_locais_table.php`
- `2026_03_13_160300_create_responsaveis_table.php`
- `2026_03_13_170000_create_bens_patrimoniais_table.php`
- `2026_03_13_171000_create_historico_localizacao_bens_table.php`
- `2026_03_13_171100_create_transferencias_bens_table.php`
- `2026_03_13_171200_create_baixas_bens_table.php`
- `2026_03_13_171300_create_responsabilidade_bens_table.php`
- `2026_03_13_172000_create_metodos_depreciacao_table.php`
- `2026_03_13_172100_create_parametros_depreciacao_table.php`
- `2026_03_13_172200_create_depreciacoes_bens_table.php`
- `2026_03_13_173000_create_inventarios_table.php`
- `2026_03_13_173100_create_inventario_itens_table.php`
- `2026_03_13_173200_create_conciliacoes_patrimoniais_table.php`
- `2026_03_13_173300_create_divergencias_inventario_table.php`
- `2026_03_13_174000_create_logs_operacoes_patrimoniais_table.php`
- `2026_03_13_174100_create_auditorias_patrimoniais_table.php`
- `2026_03_13_175000_create_plaquetas_patrimoniais_table.php`
- `2026_03_13_180000_add_empresa_role_to_usuarios_table.php`
- `2026_03_13_180100_create_roles_permissoes_table.php`

## 12. Status Atual do Sistema

Ja implementado:

- backend REST patrimonial multiempresa
- autenticacao e permissoes
- dashboard web
- tela de empresas com CRUD visual no frontend
- exportacoes de relatorios
- app mobile inicial para inventario

Parcial ou em evolucao:

- integracao automatica com NWB System para empresas
- persistencia de endereco na tela de empresas
- expansao do frontend CRUD para todos os modulos
- ampliacao das telas web alem de dashboard, usuarios, permissoes e empresas

## 13. Sugestao de Proximos Documentos

Apos este documento, faz sentido gerar:

1. `MAPA_DE_ROTAS_API.md`
2. `DICIONARIO_DE_DADOS_NWBASSET.md`
3. `MANUAL_DE_PERFIS_E_PERMISSOES.md`
4. `ARQUITETURA_INTEGRACAO_NWB_SYSTEM.md`
5. `PLANO_DE_IMPLANTACAO_E_PRODUCAO.md`
