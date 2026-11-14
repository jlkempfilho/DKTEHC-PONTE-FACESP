-- Fontes externas, com a natureza marcada: o motor e o curador sabem de onde veio cada trecho.
ALTER TABLE conhecimento.documento ADD COLUMN IF NOT EXISTS natureza text NOT NULL DEFAULT 'oficial_entidade'
  CHECK (natureza IN ('oficial_entidade','oficial_outro_orgao','legislacao','enciclopedia'));
CREATE INDEX IF NOT EXISTS documento_natureza_idx ON conhecimento.documento (natureza);
