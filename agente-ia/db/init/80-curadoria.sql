-- COL.3 + API.1 - curadoria de documentos e entrada de conhecimento por sistema externo.
-- Quem envia (token de envio) não aprova; quem aprova (curador) fica registrado. Trilha só cresce.
ALTER TABLE conhecimento.documento ADD COLUMN IF NOT EXISTS enviado_por text;

CREATE TABLE IF NOT EXISTS auditoria.documento_decisao (
  id           bigserial PRIMARY KEY,
  documento_id bigint NOT NULL REFERENCES conhecimento.documento(id) ON DELETE RESTRICT,   -- documento com histórico não some
  de           text,                 -- null = entrada nova
  para         text NOT NULL CHECK (para IN ('pendente','aprovado','rejeitado')),
  ator         text NOT NULL,
  motivo       text,
  em           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documento_decisao_doc_idx ON auditoria.documento_decisao (documento_id, em DESC);
ALTER TABLE auditoria.documento_decisao OWNER TO app_owner;
GRANT SELECT, INSERT ON auditoria.documento_decisao TO admin_catalogo;     -- sem UPDATE/DELETE: ninguém reescreve a trilha
GRANT USAGE ON SEQUENCE auditoria.documento_decisao_id_seq TO admin_catalogo;
