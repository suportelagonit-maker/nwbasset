# Segurança — pentest e correções

Registro do teste de intrusão feito no sistema em **11/10/2026** (sobre o
próprio sistema, em produção para a superfície anônima e em ambiente local
com usuários de teste criados e removidos para os testes autenticados) e das
correções aplicadas em seguida.

## O que resistiu

Verificado e sem problema:

- **Isolamento entre empresas comuns** — usuário de uma empresa recebe 403
  ao pedir outra, e 404 ao tentar um bem por ID de outra.
- **Mass assignment** — forjar `empresa_id` na criação de bem é barrado (422).
- **Escalonamento de privilégio** — auditor tentando se promover a
  SUPER_ADMIN recebe 403.
- **Permissão por papel** — auditor não lista usuários nem escreve (403).
- **SQL injection** — todos os `whereRaw`/`selectRaw` usam binding ou
  literais fixos; nenhuma interpolação de variável em SQL.
- **Upload** — imagens validadas por tipo (`mimes`), tamanho e quantidade.
- **Login** — rate limit ativo (429) e login por senha desligado em
  produção (403; a entrada é só pelo NWB ID).
- **Termo LGPD** — bloqueia o uso até o aceite (428).
- **Sem exposição** de `.env`, `.git`, endpoints de debug (todos 404);
  `APP_DEBUG=false`.

## O que foi corrigido

### 1. CRÍTICO — Isolamento quebrado pela "empresa mestra"

**Era:** qualquer usuário cuja empresa se chamasse "NWB Asset"
(`MASTER_COMPANY_NAME`) enxergava **todas** as outras empresas, independente
do perfil. Como o provisionamento do NWB ID joga todo usuário novo na
empresa padrão (id 1, "NWB Asset") com perfil AUDITOR, na prática qualquer
auditor recém-criado **lia** os dados de qualquer cliente, e um gestor
**escrevia** (provado em laboratório: um GESTOR da empresa mestra deu baixa
num ativo de outra empresa). Era a quebra do isolamento multiempresa, que é
a premissa de um SaaS vendido a terceiros.

**Correção:** o acesso fora da própria empresa passou a ser exclusivo do
`SUPER_ADMIN` — o papel de supervisão do fornecedor. O atalho por nome de
empresa foi removido (`Usuario::canAccessAllEmpresas()`). Coberto por
`MultiCompanyIsolationTest` (usuário na empresa chamada "NWB Asset" agora
recebe 403/403/404; SUPER_ADMIN continua alcançando todas).

> **Recomendação operacional ainda em aberto:** apontar
> `NWBID_EMPRESA_PADRAO_ID` para uma empresa real de cliente, não a demo
> "NWB Asset". Com a correção acima o vazamento está fechado de qualquer
> forma, mas usuários novos continuam nascendo na empresa de demonstração
> até isso ser ajustado — é organização de dados, não mais segurança.

### 2. ALTO — Consulta pública expunha dado pessoal e era raspável

**Era:** `GET /api/v1/public/plaquetas/lookup` (anônima) retornava **nome e
matrícula do responsável**, com códigos sequenciais (`PAT-1-0001`, `0002`…)
e **sem rate limit** — dava para raspar o inventário inteiro e os dados dos
responsáveis de fora.

**Correção:** o bloco `responsavel` saiu do retorno público (fica só na área
autenticada), e a rota ganhou `throttle:consulta-publica` (20/min por IP).
Coberto por `ConsultaPublicaPlaquetaTest`.

### 3. ALTO — 48 advisories de dependência (13 de severidade alta)

**Era:** `laravel/framework`, `guzzle`, `league/commonmark` (9),
`symfony/*`, `dompdf` com advisories conhecidos.

**Correção:** `composer update` — **48 → 0 advisories**. dompdf 3.1.5→3.1.6,
Laravel 12.54→12.69, guzzle 7.10→7.15, entre outros.

### 4. MÉDIO — Endurecimento

- **Admin semeado dormente:** `admin@nwbasset.local` (SUPER_ADMIN, senha
  pública no seeder) **desativado em produção** (`ativo=false`) e senha
  trocada por valor aleatório.
- **Tokens não expiravam** (`sanctum.expiration = null`): agora **12 h**
  (`SANCTUM_TOKEN_TTL`, em minutos). Cabe um dia de contagem de inventário;
  um token vazado não vale para sempre.
- **CORS `*`** mesmo em rotas autenticadas: `config/cors.php` restringe às
  origens conhecidas (`CORS_ALLOWED_ORIGINS`), sem credenciais. O navegador
  nunca chama `/api/v1` cross-origin (vai pelo proxy same-origin do Next),
  então não há perda de função.
- **Cabeçalhos de segurança** no vhost do Apache: HSTS,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin`, e remoção de
  `X-Powered-By`.

## Follow-ups conhecidos

- **CSP (Content-Security-Policy)** não foi adicionada: uma CSP malfeita
  quebra o PWA e a câmera do scanner. Fica como trabalho próprio, de
  preferência em `report-only` primeiro.
- **Banner `Server: Apache`** permanece (vem do cPanel/Apache do host;
  removê-lo exige `ServerTokens Prod` global, que afeta os outros sites da
  VPS).
- **Mateus e Lucas** entram como SUPER_ADMIN (`NWBID_PERFIL_ADMIN`). Com a
  correção 1, SUPER_ADMIN é justamente quem pode cruzar empresas — então
  são, de fato, administradores do fornecedor. Se não for essa a intenção,
  rebaixar para um perfil por empresa.
- **Enumeração** da consulta pública fica mitigada pelo rate limit, não
  eliminada; códigos não sequenciais seriam a solução definitiva.
