# NWB Asset — frontend Next.js 16 / React 19
#
# Atencao: NEXT_PUBLIC_API_BASE_URL e lida pelo NAVEGADOR, nao pelo container.
# Ela e embutida no bundle durante o build, entao precisa ser a URL publica da
# API (no local, http://localhost:5000/api/v1; na VPS, https://api.seudominio).
# Nao adianta usar o nome do servico Docker aqui.
FROM node:24-alpine AS deps

WORKDIR /app
COPY frontend-web/package.json frontend-web/package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder

WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED=$NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY frontend-web/ ./
RUN npm run build

FROM node:24-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 5001
CMD ["npm", "run", "start"]
