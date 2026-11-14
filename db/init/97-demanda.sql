-- Percurso 2 do desafio FACESP: necessidade sem solução vira ficha de demanda, relatos parecidos se agrupam,
-- a startup avalia, pede esclarecimento ou propõe adaptação/piloto. Campos = fichas "Demanda" e "Piloto" do guia.
CREATE SCHEMA IF NOT EXISTS demanda AUTHORIZATION app_owner;

CREATE TABLE IF NOT EXISTS demanda.ficha (
  id                 serial PRIMARY KEY,
  grupo_id           integer,                 -- relatos parecidos apontam para a primeira ficha do grupo
  criada_em          timestamptz NOT NULL DEFAULT now(),
  segmento           text NOT NULL,
  territorio         text,
  canal_venda        text,
  problema           text NOT NULL,
  frequencia         text,
  pratica_atual      text NOT NULL,
  sistemas           text,
  restricoes         text,
  resultado_esperado text NOT NULL,
  embedding          vector(1024),            -- do problema, para achar relatos parecidos
  status             text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_avaliacao','piloto','atendida'))
);
CREATE INDEX IF NOT EXISTS ficha_grupo_idx ON demanda.ficha (grupo_id);

CREATE TABLE IF NOT EXISTS demanda.resposta (
  id          serial PRIMARY KEY,
  grupo_id    integer NOT NULL,
  criada_em   timestamptz NOT NULL DEFAULT now(),
  startup     text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('esclarecimento','adaptacao','piloto')),
  texto       text NOT NULL,
  -- ficha "Piloto" do guia (preenchida quando tipo = piloto)
  responsavel text, proximo_passo text, indicador text, ponto_partida text, resultado_esperado text
);

ALTER TABLE demanda.ficha OWNER TO app_owner;
ALTER TABLE demanda.resposta OWNER TO app_owner;
GRANT USAGE ON SCHEMA demanda TO motor, admin_catalogo;
GRANT SELECT (id, grupo_id, embedding, status, problema), INSERT ON demanda.ficha TO motor;   -- grava e acha o grupo; o problema não identifica a loja
GRANT UPDATE (grupo_id) ON demanda.ficha TO motor;
GRANT USAGE ON SEQUENCE demanda.ficha_id_seq TO motor;
GRANT SELECT, UPDATE (status) ON demanda.ficha TO admin_catalogo;                   -- curadoria e startup (via token próprio)
GRANT SELECT, INSERT ON demanda.resposta TO admin_catalogo;
GRANT USAGE ON SEQUENCE demanda.resposta_id_seq TO admin_catalogo;
