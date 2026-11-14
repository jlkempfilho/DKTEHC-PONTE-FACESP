-- Trilhas: processos da associação (POP, IT, manual) transformados em etapas que o atendimento conduz.
-- A proposta gerada a partir do documento fica pendente até a curadoria aprovar; cada etapa guarda o trecho de origem.
CREATE SCHEMA IF NOT EXISTS trilha AUTHORIZATION app_owner;

CREATE TABLE IF NOT EXISTS trilha.trilha (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{2,80}$'),
  nome        text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('servico','solicitacao','inovacao')),
  gatilhos    text[] NOT NULL DEFAULT '{}',        -- como o associado costuma pedir
  etapas      jsonb NOT NULL,                       -- [{id, tipo, texto, documento, trecho_origem, confere}]
  lacunas     jsonb NOT NULL DEFAULT '[]',          -- [{pergunta, resposta}]: o que o documento não diz
  fonte_nome  text NOT NULL,
  fonte_texto text NOT NULL,
  status      text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada')),
  versao      integer NOT NULL DEFAULT 1,
  criada_em   timestamptz NOT NULL DEFAULT now(),
  aprovada_por text,
  aprovada_em timestamptz
);

-- documento que o associado manda durante uma trilha; a curadoria aceita ou devolve com motivo
CREATE TABLE IF NOT EXISTS trilha.documento (
  id          serial PRIMARY KEY,
  sessao      text NOT NULL,
  trilha_id   text NOT NULL REFERENCES trilha.trilha(id),
  etapa_id    text NOT NULL,
  nome        text NOT NULL,
  arquivo     text NOT NULL,
  tipo_mime   text NOT NULL,
  conteudo    bytea NOT NULL,
  status      text NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise','aceito','devolvido')),
  motivo      text,
  enviado_em  timestamptz NOT NULL DEFAULT now(),
  analisado_em timestamptz,
  expira_em   timestamptz NOT NULL DEFAULT now() + interval '90 days'   -- LGPD: documento pessoal não fica para sempre
);
CREATE INDEX IF NOT EXISTS documento_sessao_idx ON trilha.documento (sessao);

-- aviso para a conversa (documento aceito/devolvido): entregue na próxima interação do associado
CREATE TABLE IF NOT EXISTS trilha.evento (
  id        serial PRIMARY KEY,
  sessao    text NOT NULL,
  trilha_id text NOT NULL,
  texto     text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  entregue  boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS evento_pendente_idx ON trilha.evento (sessao) WHERE NOT entregue;

ALTER TABLE trilha.trilha OWNER TO app_owner;
ALTER TABLE trilha.documento OWNER TO app_owner;
ALTER TABLE trilha.evento OWNER TO app_owner;
GRANT USAGE ON SCHEMA trilha TO motor, admin_catalogo;
GRANT SELECT (id, nome, tipo, gatilhos, etapas, lacunas, fonte_texto, status) ON trilha.trilha TO motor;
GRANT INSERT (sessao, trilha_id, etapa_id, nome, arquivo, tipo_mime, conteudo) ON trilha.documento TO motor;
GRANT SELECT (id, sessao, trilha_id, etapa_id, nome, status, motivo) ON trilha.documento TO motor;
GRANT USAGE ON SEQUENCE trilha.documento_id_seq TO motor;
GRANT SELECT, UPDATE (entregue) ON trilha.evento TO motor;
GRANT SELECT, INSERT, UPDATE ON trilha.trilha TO admin_catalogo;
GRANT SELECT, UPDATE (status, motivo, analisado_em) ON trilha.documento TO admin_catalogo;
GRANT INSERT, SELECT ON trilha.evento TO admin_catalogo;
GRANT USAGE ON SEQUENCE trilha.evento_id_seq TO admin_catalogo;

-- solução cadastrada por startup: só entra no catálogo depois que a curadoria aprova
CREATE TABLE IF NOT EXISTS trilha.proposta_solucao (
  id        serial PRIMARY KEY,
  startup   text NOT NULL,
  dados     jsonb NOT NULL,
  status    text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada')),
  criada_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE trilha.proposta_solucao OWNER TO app_owner;
GRANT SELECT, INSERT, UPDATE (status) ON trilha.proposta_solucao TO admin_catalogo;
GRANT USAGE ON SEQUENCE trilha.proposta_solucao_id_seq TO admin_catalogo;
