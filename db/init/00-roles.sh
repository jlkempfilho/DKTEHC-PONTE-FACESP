#!/bin/bash
# Papéis com menor privilégio. Senhas vêm do .env (fora do git), nunca do código.
set -euo pipefail
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v motor="$APP_MOTOR_PASSWORD" -v admin="$APP_ADMIN_PASSWORD" -v aval="$APP_AVALIADOR_PASSWORD" -v atend="$APP_ATENDENTE_PASSWORD" <<'SQL'
CREATE ROLE app_owner NOLOGIN;
CREATE ROLE motor LOGIN PASSWORD :'motor' CONNECTION LIMIT 50;
CREATE ROLE admin_catalogo LOGIN PASSWORD :'admin' CONNECTION LIMIT 5;
CREATE ROLE avaliador LOGIN PASSWORD :'aval' CONNECTION LIMIT 5;
CREATE ROLE atendente LOGIN PASSWORD :'atend' CONNECTION LIMIT 10;   -- único papel que lê o relato do handoff
ALTER ROLE motor SET statement_timeout = '5s';      -- consulta do atendimento nunca trava o pool
ALTER ROLE avaliador SET statement_timeout = '60s';
REVOKE ALL ON DATABASE hackathon FROM PUBLIC;
GRANT CONNECT ON DATABASE hackathon TO motor, admin_catalogo, avaliador, atendente;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SQL
