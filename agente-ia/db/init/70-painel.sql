-- CAN.3/CAN.5: o curador lê agregados de atendimento e a 1ª mensagem das lacunas. Nunca lê atendimento.contato (dado pessoal).
GRANT USAGE ON SCHEMA atendimento TO admin_catalogo;
GRANT SELECT ON atendimento.conversa, atendimento.mensagem TO admin_catalogo;
