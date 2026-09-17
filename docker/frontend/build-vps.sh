#!/bin/sh
# Build do frontend na VPS Premium (CentOS 7, kernel 3.10).
#
# Nessa maquina o `next build` morre com "EPERM: operation not permitted,
# write": o Node usa pwritev2(RWF_NOAPPEND), que o kernel nao tem, e o seccomp
# padrao do Docker devolve EPERM em vez de ENOSYS, o que impede a libuv de cair
# para a chamada antiga. Com seccomp=unconfined o build passa — mas nem o
# BuildKit nem o builder classico aceitam essa opcao no `docker build`.
#
# Entao o build roda num container comum (que aceita --security-opt) e os
# artefatos ficam em .build/frontend; o docker-compose.vps.yml monta a imagem
# final a partir dessa pasta, sem compilar nada.
#
#   ./docker/frontend/build-vps.sh
#   docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
set -eu

cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
    echo "erro: .env nao encontrado em $(pwd)" >&2
    exit 1
fi

set -a
. ./.env
set +a

OUT=.build/frontend
rm -rf "$OUT"
mkdir -p "$OUT"

docker run --rm --network host --security-opt seccomp=unconfined \
    -v "$PWD/frontend-web:/src:ro" \
    -v "$PWD/$OUT:/out" \
    -w /app \
    -e NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-}" \
    -e NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED="${NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED:-0}" \
    -e NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}" \
    node:24-alpine sh -c '
        set -e
        cp -r /src/. /app
        npm ci --no-audit --no-fund
        npm run build
        cp -r .next node_modules public package.json /out/
    '

# Imagem de execucao: so copia o que ja foi compilado (mesmo layout do estagio
# "production" de docker/frontend/Dockerfile).
cat > "$OUT/Dockerfile" <<'DOCKERFILE'
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001
COPY . .
EXPOSE 5001
CMD ["npm", "run", "start"]
DOCKERFILE

echo "frontend compilado em $OUT — agora: docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build"
