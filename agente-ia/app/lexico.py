"""Monta o léxico (palavras que o sistema já conhece) a partir do catálogo e dos trechos não rejeitados.

python app/lexico.py
"""
import re
from db import RAIZ, conectar, normalizar

PALAVRA = re.compile(r"[a-zà-ú0-9]{3,}", re.I)

with conectar("admin_catalogo") as con, con.cursor() as cur:
    palavras = set()
    for (txt,) in cur.execute("""SELECT concat_ws(' ', nome, descricao, array_to_string(assuntos, ' '), atribuicao, limites, encaminhamento)
                                 FROM catalogo.servico
                                 UNION ALL
                                 SELECT t.conteudo FROM conhecimento.trecho t JOIN conhecimento.documento d ON d.id = t.documento_id
                                 WHERE d.curadoria <> 'rejeitado'"""):
        palavras.update(normalizar(p) for p in PALAVRA.findall(txt or ""))
    # dicionário geral do português (VERO/LibreOffice pt_BR, LGPLv3/MPL): palavra comum não vira pergunta ao lojista
    geral = set()
    dic = RAIZ / "carga" / "lexico" / "pt_BR.dic"
    if dic.exists():
        for linha in dic.read_text(encoding="utf-8-sig").splitlines()[1:]:
            base = linha.split("/", 1)[0]
            if "." not in base:
                geral.update(normalizar(p) for p in PALAVRA.findall(base))
    cur.execute("TRUNCATE conhecimento.lexico")
    # domínio = o que aparece no catálogo e nos trechos do MP; geral = dicionário. Palavra nos dois fica como domínio.
    with cur.copy("COPY conhecimento.lexico (palavra, fonte) FROM STDIN") as cp:
        for p in sorted(palavras):
            cp.write_row((p, "dominio"))
        for p in sorted(geral - palavras):
            cp.write_row((p, "geral"))
    # radicais também: "descumpriu" e "descumprir" viram o mesmo radical e não disparam pergunta à toa
    cur.execute("""INSERT INTO conhecimento.lexico (palavra, fonte)
                   SELECT DISTINCT ON (1) (ts_lexize('portuguese_stem', palavra))[1], fonte FROM conhecimento.lexico
                   WHERE (ts_lexize('portuguese_stem', palavra))[1] IS NOT NULL ORDER BY 1, fonte = 'geral' ON CONFLICT DO NOTHING""")
    con.commit()
    print(cur.execute("SELECT count(*) FROM conhecimento.lexico").fetchone()[0], "palavras e radicais no léxico")
