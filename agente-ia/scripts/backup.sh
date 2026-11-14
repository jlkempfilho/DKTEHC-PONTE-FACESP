#!/usr/bin/env bash
# Dump do banco do protótipo para fora do volume Docker (fora do git: pode conter atendimento).
# Uso: bash scripts/backup.sh        -> ../facesp-hack-backups/hackathon-AAAAMMDD-HHMM.dump  (mantém os 10 mais recentes)
# Restaurar: docker exec -i facesp-db pg_restore -U app_super -d hackathon --clean --if-exists < arquivo.dump
set -euo pipefail
cd "$(dirname "$0")/.."
DESTINO="../facesp-hack-backups"; mkdir -p "$DESTINO"
U=$(grep ^PG_SUPERUSER= .env | cut -d= -f2- | tr -d '\r')
ARQ="$DESTINO/hackathon-$(date +%Y%m%d-%H%M).dump"
docker exec facesp-db pg_dump -U "$U" -d hackathon -Fc --exclude-schema=carga_teste > "$ARQ"
ls -1t "$DESTINO"/hackathon-*.dump | tail -n +11 | xargs -r rm --
echo "backup: $ARQ ($(du -h "$ARQ" | cut -f1))"
