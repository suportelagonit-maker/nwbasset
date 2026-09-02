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
