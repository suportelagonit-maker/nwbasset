# Publicação do NWB Asset em VPS

Plano de produção. **Nada aqui foi executado ainda** — o ambiente validado até agora é o
Docker local, com os três containers de pé e o banco migrado.

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
#   APP_URL=https://patrimonio.SEU-DOMINIO
#   NEXT_PUBLIC_API_BASE_URL=https://patrimonio.SEU-DOMINIO/api/v1
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
~/.acme.sh/acme.sh --issue -d patrimonio.SEU-DOMINIO -w /home/<conta>/public_html   # ou --standalone com httpd parado
mkdir -p /etc/ssl/nwbasset && ~/.acme.sh/acme.sh --install-cert -d patrimonio.SEU-DOMINIO \
  --fullchain-file /etc/ssl/nwbasset/fullchain.pem --key-file /etc/ssl/nwbasset/key.pem \
  --reloadcmd "/scripts/restartsrv_httpd"
```

### Vhost no Apache do cPanel

Acrescentar em `/etc/apache2/conf.d/includes/post_virtualhost_global.conf` (fazer
`.bak` antes, como nos demais), seguindo o bloco do `ncedu`:

```apache
<VirtualHost 162.241.100.219:80 127.0.0.1:80>
    ServerName patrimonio.SEU-DOMINIO
    ProxyPass /.well-known/acme-challenge/ !
    Redirect permanent / https://patrimonio.SEU-DOMINIO/
</VirtualHost>

<VirtualHost 162.241.100.219:443 127.0.0.1:443>
    ServerName patrimonio.SEU-DOMINIO
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

1. **Domínio** — qual subdomínio (`patrimonio.<dominio>`)? Sem isso não há DNS, certificado nem CAPTCHA.
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
