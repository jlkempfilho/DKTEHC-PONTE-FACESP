"""MOT.3 - gera vetores (bge-m3 local) para serviços do catálogo e trechos de conhecimento. Incremental: só o que está sem vetor.

python app/embeddings.py
"""
import json, time, urllib.error, urllib.request
from db import _env, conectar

LOTE = 32


def vetorizar(textos, e=None):
    """Pergunta única roda na CPU: na GPU de 8 GB o bge-m3 expulsava o qwen e cada mensagem pagava ~11 s de recarga.
    Lote (carga da base) continua na GPU."""
    e = e or _env()
    url = e.get("LLM_LOCAL_URL", "http://127.0.0.1:11435") + "/api/embed"
    modelo = e.get("EMBED_MODELO", "bge-m3")
    req = urllib.request.Request(url, data=json.dumps({"model": modelo, "input": textos, "truncate": True, **({} if len(textos) > 1 else {"options": {"num_gpu": 0}})}).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return modelo, json.loads(r.read())["embeddings"]
    except (urllib.error.URLError, TimeoutError) as e:   # vira ErroLLM: o motor trata como falha controlada, sem derrubar o atendimento
        from llm import ErroLLM
        raise ErroLLM(f"embeddings sem resposta: {e}") from None


def literal(v):
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def texto_servico(r):
    sid, nome, desc, assuntos, atrib = r
    return f"{nome}. {desc} Assuntos: {', '.join(assuntos)}. Atribuição: {atrib}"


def rodar():
    e = _env()
    with conectar("admin_catalogo") as con, con.cursor() as cur:
        servicos = cur.execute("SELECT id, nome, descricao, assuntos, atribuicao FROM catalogo.servico WHERE embedding IS NULL").fetchall()
        if servicos:
            modelo, vs = vetorizar([texto_servico(s) for s in servicos], e)
            for s, v in zip(servicos, vs):
                cur.execute("UPDATE catalogo.servico SET embedding = %s::vector, modelo_embedding = %s WHERE id = %s", (literal(v), modelo, s[0]))
            con.commit()
        total, t0 = 0, time.perf_counter()
        while True:
            lote = cur.execute("""SELECT t.id, t.conteudo FROM conhecimento.trecho t JOIN conhecimento.documento d ON d.id = t.documento_id
                                  WHERE t.embedding IS NULL AND d.curadoria <> 'rejeitado' ORDER BY t.id LIMIT %s""", (LOTE,)).fetchall()
            if not lote:
                break
            modelo, vs = vetorizar([c for _, c in lote], e)
            for (tid, _), v in zip(lote, vs):
                cur.execute("UPDATE conhecimento.trecho SET embedding = %s::vector, modelo_embedding = %s WHERE id = %s", (literal(v), modelo, tid))
            con.commit()
            total += len(lote)
            if total % 640 == 0:
                print(f"{total} trechos, {total / (time.perf_counter() - t0):.1f}/s", flush=True)
    return len(servicos), total


if __name__ == "__main__":
    print("serviços, trechos vetorizados:", rodar())
