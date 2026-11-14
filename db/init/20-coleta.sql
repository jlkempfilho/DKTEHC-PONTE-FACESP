-- Coleta de fontes públicas: tudo que vem da internet entra como PENDENTE de curadoria da associação.
-- Trecho pendente pode orientar em linguagem geral; contato, prazo, unidade e documento exigido só do catálogo.
ALTER TABLE conhecimento.documento
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'coleta_publica' CHECK (origem IN ('coleta_publica','api_externa','curadoria')),
  ADD COLUMN IF NOT EXISTS curadoria text NOT NULL DEFAULT 'pendente' CHECK (curadoria IN ('pendente','aprovado','rejeitado')),
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS tipo text CHECK (tipo IN ('html','pdf')),
  ADD COLUMN IF NOT EXISTS coletado_em timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS documento_curadoria_idx ON conhecimento.documento (curadoria);
ALTER TABLE conhecimento.trecho ADD COLUMN IF NOT EXISTS area text;
CREATE INDEX IF NOT EXISTS trecho_area_idx ON conhecimento.trecho (area);

-- Fila do coletor: o que já foi visto, quando e com que resultado (retomável, sem revisitar à toa).
CREATE TABLE IF NOT EXISTS conhecimento.coleta_url (
  url        text PRIMARY KEY,
  status     integer,
  motivo     text,
  visto_em   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conhecimento.coleta_url OWNER TO app_owner;
GRANT SELECT, INSERT, UPDATE ON conhecimento.coleta_url TO admin_catalogo;

ALTER TABLE conhecimento.coleta_url ADD COLUMN IF NOT EXISTS profundidade integer NOT NULL DEFAULT 0;
