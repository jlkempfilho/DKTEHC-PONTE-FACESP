-- Atendimento humano com papel próprio (LGPD: o relato do cidadão só é visto por quem atende) e expiração do relato.
-- O papel "atendente" nasce em 00-roles.sh (senha do .env). Contas individuais: token por pessoa, só o hash no banco.
CREATE TABLE IF NOT EXISTS atendimento.atendente (
  id          serial PRIMARY KEY,
  nome        text NOT NULL UNIQUE,
  token_hash  text NOT NULL UNIQUE,      -- sha256 de um token aleatório de 32 bytes: sem sal, sem dicionário possível
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE atendimento.atendente OWNER TO app_owner;

ALTER TABLE atendimento.handoff
  ADD COLUMN IF NOT EXISTS atendente text,                                         -- quem assumiu/concluiu
  ADD COLUMN IF NOT EXISTS expira_em timestamptz NOT NULL DEFAULT now() + interval '90 days';

-- Relato expirado vira marcador; a linha fica para os indicadores (motivo, urgência, serviço, cidade, datas).
CREATE OR REPLACE FUNCTION atendimento.expurgar_handoff() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = atendimento, pg_temp AS $$
  WITH e AS (UPDATE atendimento.handoff SET resumo = '[relato expirado]'
             WHERE expira_em < now() AND resumo <> '[relato expirado]' RETURNING 1)
  SELECT count(*)::int FROM e
$$;
ALTER FUNCTION atendimento.expurgar_handoff() OWNER TO app_owner;
REVOKE ALL ON FUNCTION atendimento.expurgar_handoff() FROM PUBLIC;

REVOKE ALL ON atendimento.handoff FROM admin_catalogo;                              -- curador cuida do catálogo, não lê relato
GRANT USAGE ON SCHEMA atendimento TO atendente;
GRANT SELECT ON atendimento.handoff TO atendente;
GRANT UPDATE (status, atualizado_em, atendente, expira_em) ON atendimento.handoff TO atendente;
GRANT SELECT (id, nome, token_hash, ativo) ON atendimento.atendente TO atendente;  -- só para conferir o login
GRANT EXECUTE ON FUNCTION atendimento.expurgar_handoff() TO atendente;
