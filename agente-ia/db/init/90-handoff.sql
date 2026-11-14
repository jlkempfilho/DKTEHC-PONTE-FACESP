-- Pacote de handoff (anexo D3: passagem para atendimento humano com contexto). Uma linha por conversa encaminhada.
-- O motor só insere; o atendente (no protótipo, o curador) lê e muda o status. Sem FK: conversa é particionada.
CREATE TABLE IF NOT EXISTS atendimento.handoff (
  conversa_id  uuid PRIMARY KEY,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  motivo       text NOT NULL,           -- urgencia, pedido, acolhimento, frustracao, falha
  urgente      boolean NOT NULL DEFAULT false,
  servico_id   text,
  municipio    text,
  resumo       text NOT NULL,           -- mensagens do cidadão, sem interpretação do modelo
  status       text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','assumido','concluido')),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS handoff_fila_idx ON atendimento.handoff (status, urgente DESC, criado_em);
ALTER TABLE atendimento.handoff OWNER TO app_owner;
GRANT INSERT ON atendimento.handoff TO motor;                                   -- grava, não lê a fila
GRANT SELECT, UPDATE (status, atualizado_em) ON atendimento.handoff TO admin_catalogo;
