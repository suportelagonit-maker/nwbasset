#!/bin/sh
# Entrypoint do backend NWB Asset.
# Nao roda migration automaticamente: em producao a migration e um passo
# deliberado, com backup antes. Rode "docker compose exec backend php artisan migrate".
set -e

cd /var/www/html

# O symlink public/storage do repositorio aponta para um caminho absoluto de
# Windows (C:/Sistema/nwbasset/storage/app/public) e nao funciona em Linux.
# Recriamos apontando para o caminho do container.
if [ -L public/storage ] || [ -e public/storage ]; then
    rm -rf public/storage
fi
php artisan storage:link --quiet || true

# Diretorios que precisam existir e ser graváveis mesmo com volume montado.
mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
         storage/logs storage/app/public
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Espera o PostgreSQL aceitar conexao antes de subir o Apache.
if [ -n "$DB_HOST" ]; then
    printf 'Aguardando PostgreSQL em %s:%s' "$DB_HOST" "${DB_PORT:-5432}"
    i=0
    while [ "$i" -lt 60 ]; do
        if php -r "exit(@fsockopen(getenv('DB_HOST'), (int)(getenv('DB_PORT') ?: 5432)) ? 0 : 1);" 2>/dev/null; then
            printf ' ok\n'
            break
        fi
        printf '.'
        i=$((i + 1))
        sleep 1
    done
    [ "$i" -eq 60 ] && printf '\nPostgreSQL nao respondeu em 60s; seguindo mesmo assim.\n'
fi

exec "$@"
