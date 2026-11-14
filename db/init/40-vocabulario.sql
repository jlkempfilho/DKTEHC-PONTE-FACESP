-- APR.1 - vocabulário que o agente aprende perguntando ao lojista, com o curador da associação como portão.
-- Estados: aprendendo (agente pergunta aberto, depois direcionado) -> confirmado_integral (substitui sem perguntar)
--          | confirmado_parcial (sempre pergunta direcionado: pode ter outro sentido) | rejeitado (ignora o sentido).
CREATE TABLE IF NOT EXISTS conhecimento.lexico (palavra text PRIMARY KEY);   -- o que o sistema já "conhece"
ALTER TABLE conhecimento.lexico OWNER TO app_owner;

CREATE TABLE IF NOT EXISTS conhecimento.termo (
  termo        text PRIMARY KEY CHECK (termo ~ '^[a-z0-9 ]{2,40}$'),   -- normalizado: minúsculo, sem acento
  significado  text,                 -- sugestão vinda das respostas dos cidadãos
  status       text NOT NULL DEFAULT 'aprendendo'
               CHECK (status IN ('aprendendo','confirmado_integral','confirmado_parcial','rejeitado')),
  confirmacoes integer NOT NULL DEFAULT 0,
  negacoes     integer NOT NULL DEFAULT 0,
  primeiro_visto timestamptz NOT NULL DEFAULT now(),
  ultimo_visto   timestamptz NOT NULL DEFAULT now(),
  curado_por   text,
  curado_em    timestamptz,
  observacao_curador text
);
ALTER TABLE conhecimento.termo OWNER TO app_owner;

CREATE TABLE IF NOT EXISTS conhecimento.termo_evidencia (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  termo      text NOT NULL REFERENCES conhecimento.termo(termo) ON DELETE CASCADE,
  pergunta   text NOT NULL,      -- o que o agente perguntou
  resposta   text NOT NULL,      -- o que o cidadão respondeu (curto; sem dado pessoal)
  confirmou  boolean,            -- na pergunta direcionada: sim/não; na aberta: nulo
  em         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conhecimento.termo_evidencia OWNER TO app_owner;
CREATE INDEX IF NOT EXISTS termo_evidencia_termo_idx ON conhecimento.termo_evidencia (termo, em);

-- Motor aprende contagens e sugestão, NUNCA decide o status de curadoria (grant por coluna).
GRANT SELECT ON conhecimento.lexico, conhecimento.termo TO motor;
GRANT INSERT (termo, significado) ON conhecimento.termo TO motor;
GRANT UPDATE (significado, confirmacoes, negacoes, ultimo_visto) ON conhecimento.termo TO motor;
GRANT INSERT ON conhecimento.termo_evidencia TO motor;
-- Curador (admin_catalogo) lê tudo e decide.
GRANT SELECT, INSERT, UPDATE, DELETE ON conhecimento.lexico, conhecimento.termo TO admin_catalogo;
GRANT SELECT ON conhecimento.termo_evidencia TO admin_catalogo;

ALTER TABLE conhecimento.lexico ADD COLUMN IF NOT EXISTS fonte text NOT NULL DEFAULT 'dominio' CHECK (fonte IN ('dominio','geral'));
GRANT TRUNCATE ON conhecimento.lexico TO admin_catalogo;   -- lexico.py recria o léxico inteiro
