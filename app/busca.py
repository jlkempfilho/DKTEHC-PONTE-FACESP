"""MOT.3 - busca híbrida (papel motor). Filtro estruturado primeiro, depois vetor (HNSW) e texto, fundidos por RRF.

buscar_servicos(pergunta)          -> candidatos do catálogo (fonte de verdade institucional)
buscar_trechos(pergunta, municipio) -> trechos de conhecimento para orientar (nunca fonte de contato ou prazo)
"""
from embeddings import vetorizar, literal

RRF_K = 60          # constante padrão da fusão por posição recíproca
CANDIDATOS = 40     # quantos cada braço (vetor, texto) traz antes da fusão

SQL_TRECHOS = f"""
WITH filtro AS (
  SELECT t.id FROM conhecimento.trecho t JOIN conhecimento.documento d ON d.id = t.documento_id
  WHERE d.curadoria <> 'rejeitado' AND NOT (d.origem = 'api_externa' AND d.curadoria = 'pendente') AND t.vigencia @> current_date
    AND (t.municipio = 'todos' OR t.municipio = %(municipio)s)
    AND (%(area)s::text IS NULL OR t.area = %(area)s)
),
vet AS (
  SELECT t.id, row_number() OVER (ORDER BY t.embedding <=> %(v)s::vector) AS pos
  FROM conhecimento.trecho t WHERE t.id IN (SELECT id FROM filtro) AND t.embedding IS NOT NULL
  ORDER BY t.embedding <=> %(v)s::vector LIMIT {CANDIDATOS}
),
txt AS (
  SELECT t.id, row_number() OVER (ORDER BY ts_rank(t.tsv, q) DESC) AS pos
  FROM conhecimento.trecho t, websearch_to_tsquery('portuguese', public.f_unaccent(%(q)s)) q
  WHERE t.id IN (SELECT id FROM filtro) AND t.tsv @@ q
  ORDER BY ts_rank(t.tsv, q) DESC LIMIT {CANDIDATOS}
)
SELECT t.id, d.fonte_url, d.titulo, d.curadoria, t.area, t.conteudo,
       coalesce(1.0 / ({RRF_K} + vet.pos), 0) + coalesce(1.0 / ({RRF_K} + txt.pos), 0) AS score
FROM conhecimento.trecho t JOIN conhecimento.documento d ON d.id = t.documento_id
LEFT JOIN vet ON vet.id = t.id LEFT JOIN txt ON txt.id = t.id
WHERE vet.id IS NOT NULL OR txt.id IS NOT NULL
ORDER BY score DESC LIMIT %(k)s
"""

SQL_SERVICOS = """
SELECT id, nome, 1 - (embedding <=> %(v)s::vector) AS similaridade
FROM catalogo.servico WHERE ativo AND vigencia @> current_date AND embedding IS NOT NULL
ORDER BY embedding <=> %(v)s::vector LIMIT %(k)s
"""


def _vetor(pergunta):
    return literal(vetorizar([pergunta[:2000]])[1][0])


def buscar_servicos(cur, pergunta, k=5, v=None):
    v = v or _vetor(pergunta)
    return cur.execute(SQL_SERVICOS, {"v": v, "k": k}).fetchall()


def buscar_trechos(cur, pergunta, municipio=None, area=None, k=6, v=None):
    v = v or _vetor(pergunta)
    cur.execute("SET LOCAL hnsw.ef_search = 100")  # recall do índice sob filtro
    return cur.execute(SQL_TRECHOS, {"v": v, "q": pergunta[:500], "municipio": municipio or "todos", "area": area, "k": k}).fetchall()


if __name__ == "__main__":
    from db import conectar
    with conectar("motor") as con, con.cursor() as cur:
        s = buscar_servicos(cur, "como faço pra denunciar um posto de saúde que não atende")
        assert s and s[0][0] == "denuncia", s
        t = buscar_trechos(cur, "como denunciar irregularidade")
        assert t and all(r[3] != "rejeitado" for r in t), t
        print("check ok", s[0][:2], len(t), "trechos")
