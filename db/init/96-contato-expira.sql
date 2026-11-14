-- LGPD: contato pessoal (nome, telefone, e-mail) some quando vence (expira_em, 180 dias). Nada lia e nada apagava.
CREATE OR REPLACE FUNCTION atendimento.expurgar_contato() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = atendimento, pg_temp AS $$
  WITH e AS (DELETE FROM atendimento.contato WHERE expira_em < now() RETURNING 1)
  SELECT count(*)::int FROM e
$$;
ALTER FUNCTION atendimento.expurgar_contato() OWNER TO app_owner;
REVOKE ALL ON FUNCTION atendimento.expurgar_contato() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION atendimento.expurgar_contato() TO atendente;
