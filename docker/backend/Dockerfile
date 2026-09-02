# NWB Asset — backend Laravel 12 / PHP 8.3
#
# Extensoes obrigatorias, apuradas no estudo do projeto:
#   pdo_pgsql, pgsql  -> banco PostgreSQL
#   intl              -> Illuminate\Support\Number (o PHP local nao tem, e isso
#                        ja quebrava "php artisan db:show")
#   gd                -> imagens de bens, logo da empresa e etiquetas (dompdf)
#   zip               -> openspout, exportacao de planilhas
#   mbstring, opcache -> base
FROM php:8.3-apache AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        libicu-dev \
        libzip-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        unzip \
        git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        intl \
        zip \
        gd \
        opcache \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# O Laravel serve a partir de public/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

WORKDIR /var/www/html

# ---------------------------------------------------------------------------
# Producao: dependencias e codigo dentro da imagem.
# Em desenvolvimento o docker-compose.override.yml monta ./backend por cima.
# ---------------------------------------------------------------------------
FROM base AS production

COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --no-progress

COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-interaction

COPY docker/backend/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["entrypoint"]
CMD ["apache2-foreground"]
