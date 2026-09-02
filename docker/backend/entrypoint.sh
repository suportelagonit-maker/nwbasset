#!/bin/sh
# Entrypoint do backend NWB Asset.
# Nao roda migration automaticamente: em producao a migration e um passo
# deliberado, com backup antes. Rode "docker compose exec backend php artisan migrate".
set -e

cd /var/www/html

# public/storage precisa apontar para storage/app/public para o Apache servir os
# uploads. O compose monta o volume nos dois caminhos, entao normalmente
# public/storage ja chega aqui como diretorio pronto e nada precisa ser feito.
#
# So criamos o symlink quando o caminho nao existe — por exemplo se alguem subir
# o container sem o volume. E se a criacao falhar, o erro aparece: a versao
# anterior silenciava a falha com "|| true" e todo upload passava a devolver 403
# sem nenhuma pista no log.
if [ -d public/storage ] && [ ! -L public/storage ]; then
    echo "public/storage: diretorio montado, symlink dispensado."
else
    rm -rf public/storage
    if php artisan storage:link --quiet; then
        echo "public/storage: symlink criado."
    else
        echo "AVISO: nao foi possivel criar public/storage. Os uploads vao" >&2
        echo "responder 403 ou 404 ate que o volume seja montado nesse caminho." >&2
    fi
fi

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
