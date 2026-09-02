# NWB Asset

Sistema de **gestão patrimonial multiempresa**: bens patrimoniais, plaquetas com QR Code
e código de barras, inventários, transferências, baixas, responsáveis e depreciação com
regra por tipo de bem.

## Estrutura do monorepo

| Pasta | O que é | Stack |
|---|---|---|
| `backend/` | API REST em `/api/v1` — 155 rotas, 52 migrations | Laravel 12 · PHP 8.2+ · Sanctum · dompdf · openspout |
| `frontend-web/` | Painel administrativo | Next.js 16 · React 19 · Tailwind 4 · recharts · zxing |
| `frontend-mobile/` | Aplicativo de campo (leitura de plaqueta) | Expo · React Native |
| `docker/` | Imagens e entrypoint dos containers | — |
| `_oldRun/` | Scripts e documentação de execução legados | — |
| `tools/` | Conversão de documentação Markdown → DOCX | PowerShell |

Backend e frontend-web viviam em repositórios separados e foram consolidados aqui
preservando o histórico de ambos.

## Subir o ambiente com Docker

```bash
cp .env.example .env
# preencha APP_KEY (copie de backend/.env) e defina DB_PASSWORD
docker compose up -d --build
```

| Serviço | Container | Porta no host |
|---|---|---:|
| Frontend | `nwbasset-frontend` | 5001 |
| Backend | `nwbasset-backend` | 5000 |
| PostgreSQL | `nwbasset-postgres` | 5436 |

Acesse `http://localhost:5001`. A API responde em `http://localhost:5000/api/v1`.

As portas 5432 a 5435 já estão ocupadas por outros sistemas nesta máquina — daí a 5436.
Rede (`nwbasset-network`) e volumes (`nwbasset-postgres-data`, `nwbasset-storage`) são
exclusivos deste projeto e não devem ser compartilhados com os demais.

### Migrations

Não rodam sozinhas no start. Em produção é passo deliberado, com backup antes:

```bash
docker compose exec backend php artisan migrate
```

### Banco de dados

O banco vive no volume `nwbasset-postgres-data`. Para carregar um dump existente:

```bash
docker cp arquivo.dump nwbasset-postgres:/tmp/restore.dump
docker compose exec postgres sh -c \
  'pg_restore --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/restore.dump'
```

Para gerar um dump do banco em container:

```bash
docker compose exec postgres sh -c \
  'pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > docker/data/nwbasset-$(date +%Y%m%d-%H%M%S).dump
```

## Rodar sem Docker (desenvolvimento local)

Requer PHP 8.2+ **com as extensões `intl` e `gd`**, Node 20+ e PostgreSQL.

```bash
# backend
cd backend
php composer.phar install
php artisan migrate
php artisan serve --host=127.0.0.1 --port=5000

# frontend-web
cd frontend-web
npm ci
npm run dev
```

## Pontos de atenção

**Uploads não estão no Git.** Imagens de bens, notas fiscais e logos ficam em
`backend/storage/app/public`, que é ignorado pelo Git. No Docker eles vivem no volume
`nwbasset-storage`. Precisam de rotina de backup própria — o dump do banco não os cobre.

**O symlink `public/storage` do repositório aponta para um caminho Windows** e não
funciona em Linux. O entrypoint do container recria o link a cada start.

**`NEXT_PUBLIC_API_BASE_URL` é lida pelo navegador**, não pelo container, e é embutida
no bundle durante o build. Precisa ser a URL pública da API — nome de serviço Docker não
funciona. Trocar essa URL exige rebuild da imagem do frontend.

**CAPTCHA (Cloudflare Turnstile)** é validado no login pelos dois lados. Fica desligado
no ambiente Docker local porque `localhost` não está cadastrado na Cloudflare. Ao ligar,
o domínio de onde a aplicação é servida precisa estar registrado lá, senão o login trava.

## Documentação

- `CHECKLIST_HOMOLOGACAO_STABILIZATION_2026-03-26.md` — roteiro de homologação por módulo
- `MANUAL_MENUS_SIDEBAR_NWB_ASSET.md` — manual dos menus
- `_oldRun/DOCUMENTACAO_ESQUEMA_NWBASSET.md` — documentação do esquema de dados
- `docs/DEPLOY-VPS.md` — plano de publicação em produção
