#!/bin/bash
# Backup do NWB Asset na VPS Premium: banco (pg_dump -Fc) + uploads (volume
# nwbasset-storage). Cada dump e verificado por restauracao real num banco
# temporario antes de ser considerado bom. Molde: /opt/nwb/scripts/backup-nwbchat-premium.sh
set -uo pipefail
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

COMPOSE="docker compose -f /opt/nwbasset/docker-compose.yml -f /opt/nwbasset/docker-compose.vps.yml"
BACKUP_ROOT=/var/backups/nwbasset
RETENCAO_DIAS=14
RETENCAO_DOMINGO_DIAS=90
MIN_FREE_MB=5120
STAMP=$(date +%F)
LOG_PREFIX="[nwbasset-backup $(date "+%F %T")]"

exec 9>/var/run/nwbasset-backup.lock
if ! flock -n 9; then echo "$LOG_PREFIX ja existe um backup em execucao - saindo"; exit 0; fi

fail() { echo "$LOG_PREFIX ERRO: $*" >&2; exit 1; }

mkdir -p "$BACKUP_ROOT"
FREE_MB=$(df -Pm "$BACKUP_ROOT" | awk "NR==2{print \$4}")
[ "$FREE_MB" -ge "$MIN_FREE_MB" ] || fail "espaco livre ${FREE_MB}MB abaixo do minimo ${MIN_FREE_MB}MB"

DB_DUMP="$BACKUP_ROOT/db-$STAMP.dump"
UP_TGZ="$BACKUP_ROOT/uploads-$STAMP.tgz"

$COMPOSE exec -T postgres pg_dump -U nwbasset -Fc nwbasset > "$DB_DUMP.tmp" || fail "pg_dump falhou"
[ -s "$DB_DUMP.tmp" ] || fail "dump vazio"

# Restauracao real num banco temporario: e isso que prova que o dump serve.
$COMPOSE exec -T postgres sh -c "dropdb -U nwbasset --if-exists nwbasset_verifica && createdb -U nwbasset nwbasset_verifica" || fail "nao criou banco de verificacao"
docker cp "$DB_DUMP.tmp" nwbasset-postgres:/tmp/verifica.dump
if $COMPOSE exec -T postgres sh -c "pg_restore --no-owner --no-privileges -U nwbasset -d nwbasset_verifica /tmp/verifica.dump >/dev/null 2>&1 && psql -U nwbasset -d nwbasset_verifica -tAc \"select count(*) from bens_patrimoniais\" >/dev/null"; then
    $COMPOSE exec -T postgres sh -c "rm -f /tmp/verifica.dump; dropdb -U nwbasset --if-exists nwbasset_verifica" >/dev/null 2>&1
else
    $COMPOSE exec -T postgres sh -c "rm -f /tmp/verifica.dump; dropdb -U nwbasset --if-exists nwbasset_verifica" >/dev/null 2>&1
    fail "restauracao de verificacao falhou"
fi
mv "$DB_DUMP.tmp" "$DB_DUMP"

docker run --rm -v nwbasset-storage:/data:ro alpine tar czf - -C /data . > "$UP_TGZ.tmp" || fail "tar dos uploads falhou"
tar tzf "$UP_TGZ.tmp" >/dev/null || fail "tgz dos uploads corrompido"
mv "$UP_TGZ.tmp" "$UP_TGZ"

# Retencao: 14 dias; dumps de domingo ficam 90 dias.
find "$BACKUP_ROOT" -type f \( -name "db-*.dump" -o -name "uploads-*.tgz" \) -mtime +"$RETENCAO_DOMINGO_DIAS" -delete
for f in "$BACKUP_ROOT"/db-*.dump "$BACKUP_ROOT"/uploads-*.tgz; do
    [ -f "$f" ] || continue
    d=$(basename "$f" | sed -E "s/^(db|uploads)-([0-9-]+)\..*/\2/")
    dow=$(date -d "$d" +%u 2>/dev/null || echo 1)
    if [ "$dow" != "7" ] && [ "$(( ( $(date +%s) - $(date -d "$d" +%s) ) / 86400 ))" -gt "$RETENCAO_DIAS" ]; then rm -f "$f"; fi
done

echo "$LOG_PREFIX ok: $(du -h "$DB_DUMP" | cut -f1) banco, $(du -h "$UP_TGZ" | cut -f1) uploads, verificado por restauracao"
