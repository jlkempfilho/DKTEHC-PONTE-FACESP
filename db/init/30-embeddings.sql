-- MOT.3: vetor multilíngue (bge-m3, 1024 dims) em trechos e serviços.
-- ponytail: dimensão fixa por modelo. Trocar de modelo = nova coluna + reindexação; nunca misturar dimensões.
DROP INDEX IF EXISTS conhecimento.trecho_hnsw;
ALTER TABLE conhecimento.trecho ALTER COLUMN embedding TYPE vector(1024) USING NULL;
CREATE INDEX IF NOT EXISTS trecho_hnsw ON conhecimento.trecho USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

ALTER TABLE catalogo.servico ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE catalogo.servico ADD COLUMN IF NOT EXISTS modelo_embedding text;
CREATE INDEX IF NOT EXISTS servico_hnsw ON catalogo.servico USING hnsw (embedding vector_cosine_ops);

-- O gatilho de versão não pode tratar o recálculo do vetor como edição do serviço (não muda fato).
CREATE OR REPLACE FUNCTION auditoria.servico_versionar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, catalogo, auditoria AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria.servico_hist (servico_id, versao, operacao, dados) VALUES (OLD.id, OLD.versao, 'delete', to_jsonb(OLD) - 'embedding');
    RETURN OLD;
  END IF;
  IF (to_jsonb(NEW) - 'embedding' - 'modelo_embedding') = (to_jsonb(OLD) - 'embedding' - 'modelo_embedding') THEN
    RETURN NEW;  -- só o vetor mudou
  END IF;
  INSERT INTO auditoria.servico_hist (servico_id, versao, operacao, dados) VALUES (OLD.id, OLD.versao, 'update', to_jsonb(OLD) - 'embedding');
  NEW.versao := OLD.versao + 1;
  NEW.atualizado_por := session_user;
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;
