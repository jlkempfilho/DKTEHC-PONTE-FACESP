-- Protocolo: todo atendimento que gera algo (demanda, trilha, documento, chamado, piloto) ganha número, status e histórico.
-- Titular: hash com chave secreta do telefone (WhatsApp) ou do CPF/CNPJ; só os 4 últimos dígitos ficam legíveis.
CREATE SCHEMA IF NOT EXISTS rede AUTHORIZATION app_owner;

CREATE SEQUENCE IF NOT EXISTS atendimento.protocolo_seq;
CREATE TABLE IF NOT EXISTS atendimento.solicitacao (
  protocolo     text PRIMARY KEY,
  tipo          text NOT NULL CHECK (tipo IN ('demanda','trilha','documento','chamado','piloto')),
  titulo        text NOT NULL,
  referencia    text,                               -- id da ficha, da trilha ou do documento
  tema          text,                               -- estoque, vendas, financeiro... (painéis)
  status        text NOT NULL DEFAULT 'aberta'
                CHECK (status IN ('aberta','em_andamento','aguardando_associado','aguardando_associacao','concluida','cancelada')),
  sessao        text,
  titular_hash  text,
  titular_final text,                               -- 4 últimos dígitos, para exibir
  municipio     text,
  ra            text,
  origem        text NOT NULL DEFAULT 'atendimento' CHECK (origem IN ('atendimento','semente')),   -- semente = dado fictício da demo
  criada_em     timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solicitacao_titular_idx ON atendimento.solicitacao (titular_hash);
CREATE INDEX IF NOT EXISTS solicitacao_sessao_idx ON atendimento.solicitacao (sessao);
CREATE INDEX IF NOT EXISTS solicitacao_status_idx ON atendimento.solicitacao (status, tipo);

CREATE TABLE IF NOT EXISTS atendimento.solicitacao_hist (
  id        bigserial PRIMARY KEY,
  protocolo text NOT NULL REFERENCES atendimento.solicitacao(protocolo) ON DELETE CASCADE,
  de        text,
  para      text NOT NULL,
  motivo    text,
  por       text NOT NULL,                          -- atendimento, curadoria, startup
  em        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solicitacao_hist_idx ON atendimento.solicitacao_hist (protocolo, em);

-- oferta das associações da rede (base raspada dos sites, 14/11/2026): cruza com as demandas nos painéis
CREATE TABLE IF NOT EXISTS rede.associacao (
  slug      text PRIMARY KEY,
  cidade    text NOT NULL,
  ra        text NOT NULL,
  site      text,
  situacao  text NOT NULL
);
CREATE TABLE IF NOT EXISTS rede.oferta (
  slug     text NOT NULL REFERENCES rede.associacao(slug) ON DELETE CASCADE,
  solucao  text NOT NULL,
  tema     text,
  preco    text,
  fonte    text,
  PRIMARY KEY (slug, solucao)
);

ALTER TABLE atendimento.solicitacao OWNER TO app_owner;
ALTER TABLE atendimento.solicitacao_hist OWNER TO app_owner;
ALTER SEQUENCE atendimento.protocolo_seq OWNER TO app_owner;
ALTER TABLE rede.associacao OWNER TO app_owner;
ALTER TABLE rede.oferta OWNER TO app_owner;
GRANT USAGE ON SCHEMA rede TO motor, admin_catalogo;
GRANT SELECT ON rede.associacao, rede.oferta TO motor;
GRANT SELECT, INSERT, UPDATE, DELETE ON rede.associacao, rede.oferta TO admin_catalogo;
GRANT SELECT, INSERT, UPDATE (status, titular_hash, titular_final, atualizada_em, municipio, ra) ON atendimento.solicitacao TO motor;
GRANT SELECT, INSERT ON atendimento.solicitacao_hist TO motor;
GRANT USAGE ON SEQUENCE atendimento.protocolo_seq, atendimento.solicitacao_hist_id_seq TO motor;
GRANT SELECT, INSERT, UPDATE ON atendimento.solicitacao TO admin_catalogo;
GRANT SELECT, INSERT ON atendimento.solicitacao_hist TO admin_catalogo;
GRANT USAGE ON SEQUENCE atendimento.protocolo_seq, atendimento.solicitacao_hist_id_seq TO admin_catalogo;
GRANT SELECT ON atendimento.conversa, atendimento.mensagem TO admin_catalogo;   -- painel "o que o atendimento não soube"
