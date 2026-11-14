-- Hackathon Connect 7.0 (desafio FACESP) - esquema de produção.
-- Princípios: o fato institucional vem do catálogo, nunca do modelo; filtro estruturado antes do vetor;
-- menor privilégio por papel; gabarito fora do alcance do motor; histórico de atendimento particionado.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA catalogo AUTHORIZATION app_owner;
CREATE SCHEMA conhecimento AUTHORIZATION app_owner;
CREATE SCHEMA atendimento AUTHORIZATION app_owner;
CREATE SCHEMA avaliacao AUTHORIZATION app_owner;
CREATE SCHEMA auditoria AUTHORIZATION app_owner;
-- extensões moram em public: papéis usam os tipos/funções, mas ninguém cria objeto lá
GRANT USAGE ON SCHEMA public TO app_owner, motor, admin_catalogo, avaliador;
SET ROLE app_owner;

-- ========== CATÁLOGO (item 6 do anexo) ==========
CREATE TABLE catalogo.servico (
  id             text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{2,80}$'),
  nome           text NOT NULL,
  descricao      text NOT NULL,
  assuntos       text[] NOT NULL DEFAULT '{}',
  atribuicao     text NOT NULL,
  limites        text,
  canais         jsonb NOT NULL DEFAULT '[]',
  documentos     jsonb NOT NULL DEFAULT '[]',
  urgencia       text,
  critico        boolean NOT NULL DEFAULT false,   -- urgência que sempre escala para humano
  encaminhamento text NOT NULL,
  horarios       text,
  fonte_url      text NOT NULL CHECK (fonte_url ~ '^https://'),
  fonte_data     date NOT NULL,
  vigencia       daterange NOT NULL,
  ativo          boolean NOT NULL DEFAULT true,
  versao         integer NOT NULL DEFAULT 1,
  atualizado_por text NOT NULL DEFAULT current_user,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX servico_assuntos_gin ON catalogo.servico USING gin (assuntos);
CREATE INDEX servico_ativo_idx ON catalogo.servico (ativo) WHERE ativo;

CREATE TABLE catalogo.territorio (
  servico_id text NOT NULL REFERENCES catalogo.servico(id) ON DELETE CASCADE,
  municipio  text NOT NULL,                 -- 'todos' = vale para o estado inteiro
  unidade    text NOT NULL,
  contato    jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (servico_id, municipio, unidade)
);
-- municipio gravado já normalizado (minúsculo, sem acento) pela carga; o índice fica simples
CREATE INDEX territorio_municipio_idx ON catalogo.territorio (municipio);

-- Histórico e versão automáticos: quem edita não consegue apagar rastro.
CREATE TABLE auditoria.servico_hist (
  id bigserial PRIMARY KEY,
  servico_id text NOT NULL,
  versao integer NOT NULL,
  operacao text NOT NULL,
  dados jsonb NOT NULL,
  ator text NOT NULL DEFAULT current_user,
  em timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION auditoria.servico_versionar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, catalogo, auditoria AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria.servico_hist (servico_id, versao, operacao, dados) VALUES (OLD.id, OLD.versao, 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  INSERT INTO auditoria.servico_hist (servico_id, versao, operacao, dados) VALUES (OLD.id, OLD.versao, 'update', to_jsonb(OLD));
  NEW.versao := OLD.versao + 1;
  NEW.atualizado_por := session_user;
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;
CREATE TRIGGER servico_versionar BEFORE UPDATE OR DELETE ON catalogo.servico
  FOR EACH ROW EXECUTE FUNCTION auditoria.servico_versionar();

-- ========== CONHECIMENTO (trechos fracionados + vetor) ==========
CREATE TABLE conhecimento.documento (
  id          bigserial PRIMARY KEY,
  titulo      text NOT NULL,
  fonte_url   text NOT NULL CHECK (fonte_url ~ '^https://'),
  fonte_data  date NOT NULL,
  vigencia    daterange NOT NULL,
  conteudo_hash text NOT NULL UNIQUE           -- ingestão incremental: mesmo conteúdo não reprocessa
);

-- ponytail: vector(768) fixo (Gemini embedding com output 768). Trocar de modelo = nova coluna + reindex, nunca misturar dimensões.
CREATE TABLE conhecimento.trecho (
  id           bigserial PRIMARY KEY,
  documento_id bigint NOT NULL REFERENCES conhecimento.documento(id) ON DELETE CASCADE,
  servico_id   text REFERENCES catalogo.servico(id),
  municipio    text NOT NULL DEFAULT 'todos',
  assuntos     text[] NOT NULL DEFAULT '{}',
  vigencia     daterange NOT NULL,
  ordem        integer NOT NULL,
  conteudo     text NOT NULL,
  tsv          tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', conteudo)) STORED,
  embedding    vector(1024),
  modelo_embedding text
);
-- Filtro primeiro (território, assunto, vigência), vetor depois; texto como reforço lexical.
CREATE INDEX trecho_hnsw ON conhecimento.trecho USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX trecho_municipio_idx ON conhecimento.trecho (municipio);
CREATE INDEX trecho_assuntos_gin ON conhecimento.trecho USING gin (assuntos);
CREATE INDEX trecho_vigencia_gist ON conhecimento.trecho USING gist (vigencia);
CREATE INDEX trecho_tsv_gin ON conhecimento.trecho USING gin (tsv);
CREATE INDEX trecho_servico_idx ON conhecimento.trecho (servico_id);

-- ========== ATENDIMENTO (cresce todo dia: particionado por mês) ==========
CREATE TABLE atendimento.conversa (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  criado_em   timestamptz NOT NULL DEFAULT now(),
  canal       text NOT NULL CHECK (canal IN ('web','whatsapp','api','voz')),
  municipio   text,
  assunto     text,
  servico_id  text,
  urgente     boolean NOT NULL DEFAULT false,
  desfecho    text CHECK (desfecho IN ('respondido','encaminhado','humano','abstencao','abandono')),
  PRIMARY KEY (id, criado_em)
) PARTITION BY RANGE (criado_em);

CREATE TABLE atendimento.mensagem (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  conversa_id uuid NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  papel       text NOT NULL CHECK (papel IN ('cidadao','assistente','sistema')),
  conteudo    text NOT NULL,
  trechos_usados bigint[] NOT NULL DEFAULT '{}',   -- rastreabilidade: de onde veio cada resposta
  confianca   real,
  PRIMARY KEY (id, criado_em)
) PARTITION BY RANGE (criado_em);
CREATE INDEX mensagem_conversa_idx ON atendimento.mensagem (conversa_id, criado_em);

-- Dado pessoal separado do conteúdo analítico (LGPD: minimização e acesso restrito).
CREATE TABLE atendimento.contato (
  conversa_id uuid PRIMARY KEY,
  nome        text,
  telefone    text,
  email       text,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  expira_em   timestamptz NOT NULL DEFAULT now() + interval '180 days'
);

CREATE FUNCTION atendimento.criar_particoes(meses integer DEFAULT 3) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE inicio date; fim date; t text;
BEGIN
  FOR i IN 0..meses LOOP
    inicio := date_trunc('month', now())::date + (i || ' month')::interval;
    fim := inicio + interval '1 month';
    FOREACH t IN ARRAY ARRAY['conversa','mensagem'] LOOP
      EXECUTE format('CREATE TABLE IF NOT EXISTS atendimento.%I PARTITION OF atendimento.%I FOR VALUES FROM (%L) TO (%L)',
                     t || '_' || to_char(inicio, 'YYYYMM'), t, inicio, fim);
    END LOOP;
  END LOOP;
END $$;
SELECT atendimento.criar_particoes(3);
CREATE TABLE atendimento.conversa_default PARTITION OF atendimento.conversa DEFAULT;
CREATE TABLE atendimento.mensagem_default PARTITION OF atendimento.mensagem DEFAULT;

-- ========== AVALIAÇÃO (gabarito: o motor NÃO enxerga) ==========
CREATE TABLE avaliacao.caso (
  id        text PRIMARY KEY,
  pergunta  text NOT NULL,
  municipio text,
  canal     text NOT NULL DEFAULT 'web',
  critico   boolean NOT NULL DEFAULT false,
  gabarito  jsonb NOT NULL      -- {assunto, servico_id, urgente, destino, deve_abster}
);
CREATE TABLE avaliacao.rodada (
  id bigserial PRIMARY KEY, em timestamptz NOT NULL DEFAULT now(),
  modelo text NOT NULL, versao_motor text NOT NULL, observacao text
);
CREATE TABLE avaliacao.resultado (
  rodada_id bigint NOT NULL REFERENCES avaliacao.rodada(id) ON DELETE CASCADE,
  caso_id   text NOT NULL REFERENCES avaliacao.caso(id),
  saida     jsonb NOT NULL,
  acertos   jsonb NOT NULL,
  latencia_ms integer,
  PRIMARY KEY (rodada_id, caso_id)
);

RESET ROLE;

-- ========== PERMISSÕES (deny by default) ==========
REVOKE ALL ON ALL TABLES IN SCHEMA catalogo, conhecimento, atendimento, avaliacao, auditoria FROM PUBLIC;

GRANT USAGE ON SCHEMA catalogo, conhecimento TO motor;
GRANT SELECT ON ALL TABLES IN SCHEMA catalogo, conhecimento TO motor;
GRANT USAGE ON SCHEMA atendimento TO motor;
GRANT INSERT, SELECT, UPDATE ON atendimento.conversa, atendimento.mensagem TO motor;
GRANT INSERT ON atendimento.contato TO motor;            -- grava contato, não lê de volta
-- motor: nada em avaliacao nem auditoria.

GRANT USAGE ON SCHEMA catalogo, conhecimento TO admin_catalogo;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA catalogo, conhecimento TO admin_catalogo;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA conhecimento TO admin_catalogo;
GRANT USAGE ON SCHEMA auditoria TO admin_catalogo;
GRANT SELECT ON auditoria.servico_hist TO admin_catalogo;  -- lê o histórico, não altera

GRANT USAGE ON SCHEMA avaliacao TO avaliador;
GRANT SELECT ON avaliacao.caso TO avaliador;
GRANT SELECT, INSERT ON avaliacao.rodada, avaliacao.resultado TO avaliador;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA avaliacao TO avaliador;
GRANT USAGE ON SCHEMA catalogo TO avaliador;
GRANT SELECT ON ALL TABLES IN SCHEMA catalogo TO avaliador;  -- compara destino com o catálogo
