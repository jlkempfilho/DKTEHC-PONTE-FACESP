-- MOT.11 - tolerância a digitação: busca por texto sem depender de acento, e correção por similaridade contra o léxico do domínio.
CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- tsv passa a ignorar acento ("certidao" encontra "certidão")
DROP INDEX IF EXISTS conhecimento.trecho_tsv_gin;
ALTER TABLE conhecimento.trecho DROP COLUMN IF EXISTS tsv;
ALTER TABLE conhecimento.trecho ADD COLUMN tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', public.f_unaccent(conteudo))) STORED;
CREATE INDEX trecho_tsv_gin ON conhecimento.trecho USING gin (tsv);

-- vizinho mais parecido no vocabulário do MP (trigramas)
CREATE INDEX IF NOT EXISTS lexico_dominio_trgm ON conhecimento.lexico USING gin (palavra gin_trgm_ops) WHERE fonte = 'dominio';
