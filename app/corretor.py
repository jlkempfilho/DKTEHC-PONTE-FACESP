"""MOT.11 - corrige digitação só para a BUSCA. A mensagem do cidadão segue intacta para o LLM e para o registro.

corrigir(cur, texto) -> (texto_para_busca, [(errada, corrigida, similaridade)])
Palavra desconhecida com vizinho próximo no vocabulário do MP é trocada ("denuncar" -> "denunciar").
Sem vizinho próximo, fica como está e o fluxo de vocabulário decide se pergunta.
"""
import re
from db import normalizar

PALAVRA = re.compile(r"[a-zà-ú0-9]{4,}", re.I)
SIMILARIDADE_MIN = 0.45   # trigramas; abaixo disso a troca vira chute
DIFERENCA_MAX = 2         # letras a mais ou a menos


def corrigir(cur, texto):
    palavras = {normalizar(p) for p in PALAVRA.findall(texto) if not p.isdigit()}
    if not palavras:
        return texto, []
    # palavra e radical comparados por igualdade (usa o índice da chave); OR com função forçava varredura de 476 mil linhas (3 s)
    conhecidas = {r[0] for r in cur.execute(
        """WITH c AS (SELECT w, coalesce((ts_lexize('portuguese_stem', w))[1], w) r FROM unnest(%s::text[]) w)
           SELECT c.w FROM c WHERE EXISTS (SELECT 1 FROM conhecimento.lexico l WHERE l.palavra = c.w)
                                OR EXISTS (SELECT 1 FROM conhecimento.lexico l WHERE l.palavra = c.r)""", (list(palavras),))}
    correcoes = []
    for w in sorted(palavras - conhecidas):
        r = cur.execute("""SELECT palavra, similarity(palavra, %(w)s) s FROM conhecimento.lexico
                           WHERE fonte = 'dominio' AND palavra %% %(w)s AND abs(length(palavra) - length(%(w)s)) <= %(d)s
                           ORDER BY s DESC, palavra LIMIT 1""", {"w": w, "d": DIFERENCA_MAX}).fetchone()
        if r and r[1] >= SIMILARIDADE_MIN:
            correcoes.append((w, r[0], round(r[1], 2)))
    saida = texto
    for errada, certa, _ in correcoes:
        saida = re.sub(rf"\b{re.escape(errada)}\b", certa, normalizar(saida))
    return saida, correcoes


if __name__ == "__main__":
    from db import conectar
    with conectar("motor") as con, con.cursor() as cur:
        t, c = corrigir(cur, "como denuncar a prefeiura que nao recolhe o lixo")
        assert ("prefeiura", "prefeitura") in [(a, b) for a, b, _ in c], c   # "denuncar" já casa pelo radical de "denunciar"
        t2, c2 = corrigir(cur, "quero uma certidao negativa")
        assert c2 == [], c2   # sem acento já é conhecida: nada a corrigir
        print("check ok", c, "|", t)
