# Publicação do NWB Asset em VPS

Plano de produção. **Executado em 16/09/2026 — o sistema está no ar em
https://nwbasset.igrejanovoscomecos.com.br** (ver "Publicação realizada" no fim).

## O que já está pronto e vai junto

O `docker-compose.yml` da raiz é o mesmo desenho que roda na VPS: imagens construídas a
partir de `docker/backend/Dockerfile` e `docker/frontend/Dockerfile`, código copiado para
dentro da imagem (sem bind mount), rede e volumes exclusivos.

## O que ainda falta decidir e providenciar

### 1. Domínio e TLS

O frontend chama a API **pelo navegador**, então a API precisa de endereço público próprio.
Duas opções:

| Arranjo | Como fica |
|---|---|
| Dois subdomínios | `app.dominio.org.br` → frontend · `api.dominio.org.br` → backend |
| Caminho único | `app.dominio.org.br` → frontend · `app.dominio.org.br/api` → backend, via proxy reverso |

O segundo evita CORS e é mais simples de operar. Exige um proxy reverso na frente
(Nginx, Traefik ou Caddy) roteando `/api` para o container do backend.

Em qualquer caso é preciso: registro DNS apontando para o IP da VPS e certificado TLS
(Let's Encrypt via Caddy ou certbot). **Sem HTTPS o token de sessão trafega em claro.**

### 2. Variáveis que mudam em produção

```
APP_ENV=production
APP_DEBUG=false            # obrigatório: com true, erros expõem stack trace e config
APP_URL=https://api.dominio.org.br
NEXT_PUBLIC_API_BASE_URL=https://api.dominio.org.br/api/v1
DB_PASSWORD=<senha forte, diferente da local>
AUTH_CAPTCHA_ENABLED=true
NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED=1
TURNSTILE_SITE_KEY=<do painel Cloudflare>
TURNSTILE_SECRET_KEY=<do painel Cloudflare>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<mesmo site key>
```

`APP_KEY` deve ser **a mesma** do ambiente onde os dados foram gerados, ou dados
criptografados pelo Laravel deixam de ser legíveis. Copie, não gere de novo.

Trocar `NEXT_PUBLIC_API_BASE_URL` exige **rebuild da imagem do frontend** — o valor é
embutido no bundle durante o build, não lido em tempo de execução.

### 3. Cloudflare Turnstile

O domínio de produção precisa ser cadastrado no painel da Cloudflare antes de ligar o
CAPTCHA. Se ligar sem cadastrar, o login trava para todo mundo.

### 4. Portas

Na VPS, apenas o proxy reverso deve ficar exposto (80/443). Backend, frontend e banco não
precisam publicar porta no host — comunicam-se pela rede interna do Docker. Isso significa
remover ou restringir a seção `ports:` dos três serviços no compose de produção.

**O PostgreSQL não deve ficar exposto na internet.**

### 5. Backup

Duas coisas distintas, e uma não cobre a outra:

- **Banco** — `pg_dump` do volume `nwbasset-postgres-data`
- **Uploads** — volume `nwbasset-storage`, com imagens de bens, notas fiscais e logos.
  Não estão no Git nem no dump do banco.

Definir frequência, retenção e destino externo (a cópia não pode viver só na mesma VPS),
e **testar a restauração** — backup não verificado não é backup.

### 6. Dados iniciais

Decidir se a produção começa:

- **limpa** — `php artisan migrate` + seeders, cadastrando as empresas reais do zero; ou
- **com os dados atuais** — restaurando o dump do ambiente local, que hoje tem 3 empresas,
  3 filiais, 9 departamentos, 24 tipos de bens, 3 bens e 4 plaquetas. Volume de teste, não
  de operação real.

### 7. Itens de segurança a revisar antes de abrir

- `APP_DEBUG=false` confirmado
- Senha do banco exclusiva de produção, fora do Git
- Usuário administrador com senha trocada (hoje existe 1 usuário no banco)
- Rate limit no login
- Logs com rotação, para não encher o disco da VPS
- Atualização de imagem base (PHP e Node) com alguma periodicidade

## Sequência sugerida

1. Provisionar a VPS com Docker e Docker Compose
2. Apontar o DNS e emitir o certificado TLS
3. Subir o proxy reverso
4. Clonar o repositório, criar o `.env` de produção
5. `docker compose up -d --build`
6. `docker compose exec backend php artisan migrate`
7. Carregar dados iniciais conforme a decisão do item 6
8. Configurar backup de banco e de uploads, e **testar a restauração**
9. Ligar o CAPTCHA com o domínio já cadastrado
10. Percorrer o `CHECKLIST_HOMOLOGACAO_STABILIZATION_2026-03-26.md` no ambiente de produção

---

## Plano concreto — VPS Premium (levantamento de 16/09/2026)

Servidor `vps-3973099.weblagoinhario.me` (162.241.100.219). Credenciais em
`C:\Sistema\claude\vps-premium.env` (fora do Git). O que foi verificado por SSH:

| Item | Situação |
|---|---|
| SO | CentOS 7 com kernel TuxCare ELS (suporte estendido pago; o CentOS 7 em si está em fim de vida desde 06/2024) |
| Recursos | 8 vCPU · 9,7 GB RAM (≈5,3 GB livres) · 160 GB livres em `/` |
| Docker | Docker 26.1 + Compose v2.27 instalados e ativos — **já hospeda ncedu, nc-jornada, cuidar-gc, nc-tech, certificados** |
| Portas 80/443 | Apache do cPanel (`httpd`). Os sistemas em Docker publicam porta só em `127.0.0.1` e recebem tráfego por `ProxyPass` |
| TLS | `acme.sh` com renovação no cron; certificados em `/etc/ssl/<sistema>/{fullchain,key}.pem` |
| Backups | Scripts próprios por sistema em `/opt/<sistema>/scripts`, saída em `/var/backups/<sistema>`, retenção 14/90 dias, métrica para node_exporter. **Não há cópia externa (offsite)** |
| PostgreSQL do host | Existe um Postgres em `127.0.0.1:5432` (cPanel) — não usar; o NWB Asset sobe o seu próprio container |
| **Domínio** | **`nwbasset.igrejanovoscomecos.com.br` já aponta para `162.241.100.219`** (registro A verificado em 16/09/2026; o host responde HTTP 200 pelo Apache do cPanel). Falta apenas o vhost e o certificado |

### Arranjo escolhido: caminho único (`/api` no mesmo domínio)

É o mesmo desenho do `ncedu` nesta VPS: um subdomínio, o Apache roteia `/api` para o
backend e o resto para o frontend. Sem CORS, um certificado só.

| Serviço | Porta no host (só loopback) |
|---|---|
| frontend | `127.0.0.1:6200` |
| backend | `127.0.0.1:6201` |
| postgres | não publicada (rede interna do Docker) |

Portas 6200/6201 estavam livres no levantamento; confirme com `ss -ltn` antes de subir.

### Passo a passo

```bash
# 1. Código
git clone https://github.com/suportelagonit-maker/nwbasset.git /opt/nwbasset
cd /opt/nwbasset

# 2. .env de produção (NUNCA commitar)
cp .env.example .env
#   APP_ENV=production  APP_DEBUG=false
#   APP_KEY=<copiar do ambiente atual, não gerar novo>
#   APP_URL=https://nwbasset.igrejanovoscomecos.com.br
#   NEXT_PUBLIC_API_BASE_URL=https://nwbasset.igrejanovoscomecos.com.br/api/v1
#   API_BASE_URL_INTERNAL=http://backend/api/v1
#   BIND_HOST=127.0.0.1  BACKEND_PORT=6201  FRONTEND_PORT=6200  DB_PORT_HOST=6202
#   DB_PASSWORD=<senha forte exclusiva>
#   AUTH_CAPTCHA_ENABLED=true  NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED=1  + chaves Turnstile
#   LOG_CHANNEL=stderr

# 3. Subir SEM o override de desenvolvimento
docker compose -f docker-compose.yml up -d --build

# 4. Migrar (passo deliberado) e criar o admin
docker compose -f docker-compose.yml exec backend php artisan migrate --force
docker compose -f docker-compose.yml exec backend php artisan db:seed --force   # só se for começar limpo

# 5. Certificado (padrão da VPS)
~/.acme.sh/acme.sh --issue -d nwbasset.igrejanovoscomecos.com.br -w /home/<conta>/public_html   # ou --standalone com httpd parado
mkdir -p /etc/ssl/nwbasset && ~/.acme.sh/acme.sh --install-cert -d nwbasset.igrejanovoscomecos.com.br \
  --fullchain-file /etc/ssl/nwbasset/fullchain.pem --key-file /etc/ssl/nwbasset/key.pem \
  --reloadcmd "/scripts/restartsrv_httpd"
```

### Vhost no Apache do cPanel

Acrescentar em `/etc/apache2/conf.d/includes/post_virtualhost_global.conf` (fazer
`.bak` antes, como nos demais), seguindo o bloco do `ncedu`:

```apache
<VirtualHost 162.241.100.219:80 127.0.0.1:80>
    ServerName nwbasset.igrejanovoscomecos.com.br
    ProxyPass /.well-known/acme-challenge/ !
    Redirect permanent / https://nwbasset.igrejanovoscomecos.com.br/
</VirtualHost>

<VirtualHost 162.241.100.219:443 127.0.0.1:443>
    ServerName nwbasset.igrejanovoscomecos.com.br
    SSLEngine on
    SSLCertificateFile    /etc/ssl/nwbasset/fullchain.pem
    SSLCertificateKeyFile /etc/ssl/nwbasset/key.pem
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPass        /api http://127.0.0.1:6201/api
    ProxyPassReverse /api http://127.0.0.1:6201/api
    ProxyPass        /storage http://127.0.0.1:6201/storage
    ProxyPassReverse /storage http://127.0.0.1:6201/storage
    ProxyPass        /    http://127.0.0.1:6200/
    ProxyPassReverse /    http://127.0.0.1:6200/
</VirtualHost>
```

`/storage` é por onde o Laravel serve logos e imagens de bens (`APP_URL/storage/...`);
sem essa rota os uploads não abrem. `X-Forwarded-Proto` é o que faz o backend
(`trustProxies`) e o frontend (cookies `secure`) saberem que estão atrás de HTTPS.

Depois: `apachectl configtest && /scripts/restartsrv_httpd`.

### Backup (obrigatório antes de operar)

Criar `/opt/nwbasset/scripts/backup.sh` no molde de
`/opt/nwb/scripts/backup-nwbchat-premium.sh` (lock, `set -uo pipefail`, `PATH` explícito,
retenção, métrica), cobrindo **duas coisas**:

```bash
docker compose -f /opt/nwbasset/docker-compose.yml exec -T postgres \
  pg_dump -U nwbasset -Fc nwbasset > /var/backups/nwbasset/db-$(date +%F).dump
docker run --rm -v nwbasset-storage:/data:ro -v /var/backups/nwbasset:/out alpine \
  tar czf /out/uploads-$(date +%F).tgz -C /data .
```

e **testar a restauração** num container descartável. A VPS hoje não envia backup
para fora da máquina — o NWB Asset deve ser o primeiro a ter cópia externa
(rclone para um bucket/Drive), ou aceita-se o risco por escrito.

---

## Prontidão para migrar — parecer (16/09/2026)

**Conclusão: o software está pronto; a operação ainda não.** Não há bloqueio técnico
no código — o que falta são decisões e providências de infraestrutura, listadas
abaixo na ordem em que travam o go-live.

### Feito nesta revisão

- Rate limit no login (`throttle:login`: 5/min por conta+IP, 20/min por IP) — verificado com HTTP 429.
- `trustProxies` no Laravel: IP real do cliente e HTTPS reconhecidos atrás do Apache.
- Cookies de sessão do frontend com `secure` quando servidos por HTTPS.
- Compose publica portas só em `127.0.0.1`, logs no stderr com rotação (10 MB × 5).
- Suíte do backend: 20 testes / 59 asserções passando no container.
- `.gitattributes` (LF) — elimina as centenas de "arquivos modificados" fantasmas no Windows.

### Bloqueia o go-live (decidir/providenciar)

1. ~~Domínio~~ — **resolvido**: `nwbasset.igrejanovoscomecos.com.br` → `162.241.100.219`. Certificado e vhost também feitos (ver abaixo).
2. **Cloudflare Turnstile** — cadastrar o domínio e gerar chaves de produção; hoje o `.env.local` usa a chave de teste `1x000…`.
3. **`.env` de produção** — `APP_DEBUG=false`, senha nova do banco, `APP_KEY` copiada.
4. **Senha do administrador** — o seeder cria `admin@nwbasset.local / NwbAsset@123`; trocar no primeiro acesso (ou criar o usuário real e desativar este).
5. **Dados iniciais** — começar limpo ou restaurar o dump local (hoje só dados de demonstração).
6. **Backup com restauração testada** — script + cron + cópia externa.

### Recomendado antes ou logo após

- Tokens Sanctum não expiram (`expiration => null`): definir p.ex. 12 h ou revogar no logout de todos os dispositivos.
- Ícones PWA 192/512 (hoje só o `Favicon.png` 250×120) para o app ser instalável no celular.
- Monitorar `docker stats`: a VPS tem ≈5 GB livres com os outros sistemas rodando; o conjunto do NWB Asset consome ~600 MB.
- CentOS 7 ELS: planejar migração da VPS para um SO suportado no médio prazo (fora do escopo do NWB Asset).

---

## Publicação realizada — 16/09/2026

| Item | Como ficou |
|---|---|
| Código | `/opt/nwbasset` (clone do GitHub, branch `main`) |
| Containers | `nwbasset-postgres`, `nwbasset-backend` (`127.0.0.1:6201`), `nwbasset-frontend` (`127.0.0.1:6200`), rede isolada `nwbasset-network` |
| Subida | `./docker/frontend/build-vps.sh && docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build` |
| Dados | Dump do ambiente local restaurado (3 empresas, 3 filiais, 3 bens, 1 usuário) + uploads (7 arquivos) |
| TLS | Let's Encrypt via `acme.sh` (webroot `/opt/nwbasset/acme`), instalado em `/etc/ssl/nwbasset/`, renovação pelo cron do acme.sh, `systemctl reload httpd` |
| Vhosts | `/etc/apache2/conf.d/includes/post_virtualhost_global.conf` (backup `.bak-*-antes-nwbasset`); logs em `/var/log/nwbasset-*.log` |
| Backup | `/opt/nwbasset/scripts/backup.sh` (cópia versionada em `docker/scripts/backup-vps.sh`), diário às 04:50, `/var/backups/nwbasset`, **cada dump verificado por restauração real**; retenção 14 dias (domingos 90) |
| CAPTCHA | **Desligado** — sem chaves Turnstile de produção. O rate limit do login está ativo |

### Particularidades desta VPS que o repositório já absorve

Todas estão comentadas em `docker-compose.vps.yml` e `docker/frontend/build-vps.sh`:

1. **Bridge sem internet** (`FORWARD DROP`): build com `network: host`; execução segue na rede isolada.
2. **Kernel 3.10 + seccomp**: `next build` e PostgreSQL 18 falham com `EPERM` sob o seccomp padrão. O frontend é compilado num container `seccomp=unconfined` (fora do `docker build`) e postgres/frontend rodam com `seccomp=unconfined` — o mesmo que o nc-tech faz nesta máquina.
3. **Firewall de saída do host**: o host só alcança containers em portas "conhecidas" (80 sim, 5001 não). O frontend escuta na porta 80 dentro do container.
4. **Proxy `/api`**: o Next tem rotas próprias em `/api/*` (`/api/auth`, `/api/admin`...). O Apache proxia **apenas `/api/v1`** e `/storage` para o Laravel; o resto vai para o Next.
5. Havia uma regra manual `iptables -A INPUT -s 172.22.0.4 -j DROP` (IP que coube ao container do frontend) — removida; não estava persistida em arquivo. Se o frontend "parar de responder" só a partir do host, verificar `iptables -S INPUT | grep 172.22`.

### Atualizar o sistema na VPS

```bash
cd /opt/nwbasset && git pull
./docker/frontend/build-vps.sh                       # só se o frontend mudou
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
docker compose -f docker-compose.yml exec backend php artisan migrate --force   # se houver migration nova
```

### Pendências pós-publicação

- **Trocar a senha do administrador** (`admin@nwbasset.local`, senha do seed) no primeiro acesso — ou criar o usuário real e desativar este.
- Cadastrar o domínio no Cloudflare Turnstile e ligar o CAPTCHA (`AUTH_CAPTCHA_ENABLED`, chaves, rebuild do frontend).
- Cópia externa dos backups (`/var/backups/nwbasset`) — hoje ficam só na VPS.
