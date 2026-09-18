# Entrada pelo NWB ID (Keycloak) + NWB Acessos

Implementado em 17/09/2026, no mesmo modelo do NCEdu e do NC TECH.

## As três peças

| Peça | Papel | Onde |
|---|---|---|
| **NWB ID** | o crachá: e-mail e senha únicos de toda a equipe (Keycloak 26, realm `nwb-equipe`) | `https://nwbid.igrejanovoscomecos.com.br` — VPS 6 (`50.6.175.233`), container `nwb-id-keycloak` em `/home/nc-projects/nwb-id` |
| **NWB Acessos** | a portaria: quem pode abrir cada sistema (claim `sistemas`) e quem administra cada sistema | `https://acessos.igrejanovoscomecos.com.br` — mesma VPS |
| **NWB Asset** | a sala: o que cada pessoa faz aqui dentro (perfil e permissões locais) | esta aplicação |

## Como o login funciona

1. Tela `/login` → botão **Entrar com NWB ID**. O navegador inicia *authorization code + PKCE (S256)* no Keycloak com o cliente público `nwb-asset`, `scope=openid nwb-perfil`, `redirect_uri=<origem>/login`.
2. O Keycloak devolve `?code=`; o navegador troca por tokens no próprio Keycloak (cliente público, sem segredo) e guarda o `id_token` em `sessionStorage` (só para o logout).
3. O `access_token` vai para `POST /api/auth/nwbid` (Next) → `POST /api/v1/auth/nwbid` (Laravel), que:
   - valida assinatura (JWKS do realm, cache 10 min), `iss`, `exp` e destinatário (`azp`/`aud` em `NWBID_CLIENTES_ACEITOS`);
   - lê `sub`, nome (`nome_exibicao` › `name` › `given_name + family_name` › `preferred_username`), `email`, `sistemas`, `campus`, `nwb_cadastro_id`;
   - **entra quem tem `nwb-asset` na claim `sistemas` OU quem administra o `nwb-asset` no NWB Acessos** (consulta `GET /servico/administradores` com a conta de serviço `nwb-asset-api`, cache 60 s; Acessos fora do ar = não administra, nunca abre mais);
   - localiza a conta local por `usuarios.nwb_sub` ou, na primeira entrada, pelo e-mail (e grava o `nwb_sub`);
   - administrador sem conta ganha uma (`ADMIN_EMPRESA` da empresa `NWBID_EMPRESA_ADMIN_ID`, senha aleatória inutilizável); os demais sem conta recebem "peça ao administrador";
   - emite o token Sanctum de sempre. Termo de uso, cookies e o restante do sistema não sabem por onde a pessoa entrou.
4. **Sair** limpa os cookies e volta a `/login?saiu=1`; a tela encerra também a sessão no Keycloak (`end_session` com `id_token_hint` e `post_logout_redirect_uri=<origem>/login`).

Configuração pública vem de `GET /api/v1/auth/nwbid/config` em tempo de execução — trocar o `.env` do backend basta, sem rebuild do frontend.

## Variáveis (backend, via `.env` da raiz e docker-compose)

```
NWBID_ISSUER=https://nwbid.igrejanovoscomecos.com.br/realms/nwb-equipe
NWBID_CLIENTE=nwb-asset                    # cliente público do login
NWBID_CLIENTES_ACEITOS=nwb-asset           # azp/aud aceitos no token
NWBID_SISTEMA=nwb-asset                    # código no catálogo do Acessos
NWBID_EMPRESA_ADMIN_ID=1                   # empresa dos administradores provisionados
NWBID_ACESSOS_API_URL=https://acessos.igrejanovoscomecos.com.br
NWBID_ACESSOS_CLIENT_ID=nwb-asset-api      # conta de serviço (confidencial)
NWBID_ACESSOS_CLIENT_SECRET=<segredo>
AUTH_LOGIN_SENHA=false                     # true mantém e-mail/senha como alternativa
```

Com `NWBID_ISSUER` vazio o botão não aparece e o login por senha continua como antes.

## O que precisa ser feito no NWB ID e no NWB Acessos (VPS 6)

Feito por quem tem acesso ao Keycloak (admin do realm `nwb-equipe`) e ao código do Acessos. Referência: cadastro do `nc-tech` em 11/09/2026 (`/opt/nc-tech/docs/RUNBOOK_DEPLOY_NC_TECH.md`).

### 1. Cliente público do login — `nwb-asset`

```
clientId                nwb-asset
Client authentication   OFF (publicClient=true)  ← PKCE, sem segredo
Standard flow           ON · Direct access grants OFF · Service accounts OFF
PKCE method             S256
Valid redirect URIs     https://nwbasset.igrejanovoscomecos.com.br/login
                        http://localhost:5001/login        (desenvolvimento)
Valid post logout URIs  https://nwbasset.igrejanovoscomecos.com.br/*
                        http://localhost:5001/*
Web origins             https://nwbasset.igrejanovoscomecos.com.br
                        http://localhost:5001
Client scopes           openid, nwb-perfil (o mesmo do nc-edu — traz sistemas, campus, nwb_cadastro_id, nome_exibicao)
```

Com `kcadm` (dentro do container `nwb-id-keycloak`):

```bash
kcadm.sh create clients -r nwb-equipe \
  -s clientId=nwb-asset -s publicClient=true -s standardFlowEnabled=true \
  -s directAccessGrantsEnabled=false -s serviceAccountsEnabled=false \
  -s 'redirectUris=["https://nwbasset.igrejanovoscomecos.com.br/login","http://localhost:5001/login"]' \
  -s 'webOrigins=["https://nwbasset.igrejanovoscomecos.com.br","http://localhost:5001"]' \
  -s 'attributes={"pkce.code.challenge.method":"S256","post.logout.redirect.uris":"https://nwbasset.igrejanovoscomecos.com.br/*##http://localhost:5001/*"}'
# depois: adicionar o client scope "nwb-perfil" como default scope do cliente (igual ao nc-edu)
```

> Confira o post-logout no banco do Keycloak, não no `kcadm get --fields attributes` (ele devolve `{}` mesmo quando existe — lição do NC TECH).

### 2. Conta de serviço — `nwb-asset-api`

```
clientId                nwb-asset-api
Client authentication   ON (confidencial) → gerar e guardar o Client secret
Service accounts        ON · Standard flow OFF · Direct access grants OFF
```

O segredo vai para `NWBID_ACESSOS_CLIENT_SECRET` no `.env` da VPS Premium.

### 3. NWB Acessos

- Acrescentar o sistema **`nwb-asset`** ("NWB Asset") ao catálogo e a linha correspondente no mapa `SERVICOS` (o Acessos reconhece o sistema pelo `azp=nwb-asset-api` da conta de serviço).
- Aba **Sistemas › NWB Asset › Ver quem abre › Promover** os responsáveis (administradores) do NWB Asset.
- Conceder acesso (`sistemas` passa a incluir `nwb-asset`) às pessoas que vão usar.

### 4. Ligar na VPS Premium

```bash
cd /opt/nwbasset && nano .env        # preencher as variáveis NWBID_* e AUTH_LOGIN_SENHA=false
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d backend
curl -s https://nwbasset.igrejanovoscomecos.com.br/api/v1/auth/nwbid/config   # "habilitado": true
```

Sem rebuild do frontend: ele lê a configuração do backend.

## Contas locais × contas do NWB ID

- Um usuário já cadastrado em **Administração › Usuários** com o mesmo e-mail do NWB ID é vinculado na primeira entrada (`nwb_sub` gravado; `auth_origem=NWB`).
- Quem é liberado no Acessos mas não tem cadastro local recebe a mensagem para pedir ao administrador — o perfil e as permissões continuam sendo definidos aqui.
- Administradores do sistema no Acessos entram mesmo sem cadastro: a conta é criada como `ADMIN_EMPRESA` da empresa configurada (auditoria registra a origem).
- Próximo passo natural (como no NC TECH): tela **Dar acesso** dentro do NWB Asset, buscando no cadastro do NWB System e concedendo o acesso pelo Acessos em nome de quem clicou.

## Testes

`backend/tests/Feature/NwbIdLoginTest.php` — Keycloak simulado com par RSA gerado no teste e JWKS por `Http::fake`: token válido vincula pelo e-mail; sem o sistema na claim → 403; token de outro cliente → 401; liberado sem cadastro → orientação; administrador no Acessos é provisionado; login por senha pode ser desligado.
