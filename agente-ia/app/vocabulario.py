"""APR.1 - o agente aprende termo novo perguntando ao lojista, e o curador da associação decide o que vira verdade.

Fluxo por termo (estado em conhecimento.termo):
  sem registro                -> pergunta aberta: "Não reconheci 'zap'. A que você se refere?"
  aprendendo, < MIN confirm.   -> pergunta aberta de novo (acumula evidência)
  aprendendo, >= MIN confirm.  -> pergunta direcionada: "Você disse 'zap', refere-se a WhatsApp?"
  confirmado_parcial          -> sempre pergunta direcionada (pode ter outro sentido)
  confirmado_integral         -> substitui sem perguntar
  rejeitado                   -> não usa o sentido; trata como desconhecido sem perguntar de novo
"""
import re
from db import normalizar

MIN_CONFIRMACOES = 3      # respostas abertas concordantes antes de passar a perguntar direcionado
TAXA_MAX_NEGACAO = 0.34   # acima disso, volta a perguntar aberto
PALAVRA = re.compile(r"[a-zà-ú0-9]{3,}", re.I)


def desconhecidos(cur, texto, incluir_geral=False):
    """Palavras que o agente não conhece no contexto do MP.
    Sempre: fora do dicionário e do domínio. Com `incluir_geral`: também palavra comum do português que nunca apareceu
    no catálogo nem nos textos do MP (ex.: gíria "zap"), usada só quando o atendimento está realmente travado.
    Ignora nome próprio no meio da frase."""
    candidatas = []
    for i, m in enumerate(PALAVRA.finditer(texto)):
        bruta = m.group(0)
        if (i > 0 and bruta[0].isupper()) or bruta.isdigit():
            continue
        candidatas.append(normalizar(bruta))
    if not candidatas:
        return []
    fontes = {}
    for w, fonte in cur.execute(
            """WITH c AS (SELECT w, coalesce((ts_lexize('portuguese_stem', w))[1], w) r FROM unnest(%s::text[]) w)
               SELECT c.w, (SELECT l.fonte FROM conhecimento.lexico l WHERE l.palavra = ANY(ARRAY[c.w, c.r])
                            ORDER BY l.fonte = 'geral' LIMIT 1)
               FROM c""", (candidatas,)):
        fontes[w] = fonte
    decididos = {r[0] for r in cur.execute("SELECT termo FROM conhecimento.termo WHERE termo = ANY(%s) AND status IN ('confirmado_integral','rejeitado')", (candidatas,))}
    aceitas = (None, "geral") if incluir_geral else (None,)
    return [c for c in dict.fromkeys(candidatas) if fontes.get(c) in aceitas and c not in decididos]


def pergunta_para(cur, termo):
    """O que perguntar ao lojista sobre o termo. None = não perguntar."""
    r = cur.execute("SELECT significado, status, confirmacoes, negacoes FROM conhecimento.termo WHERE termo = %s", (termo,)).fetchone()
    if r is None:
        return {"tipo": "aberta", "texto": f"Não reconheci o termo \"{termo}\". A que você se refere?"}
    significado, status, conf, neg = r
    if status in ("confirmado_integral", "rejeitado"):
        return None
    direcionar = significado and (status == "confirmado_parcial" or
                                  (conf >= MIN_CONFIRMACOES and neg / max(conf + neg, 1) <= TAXA_MAX_NEGACAO))
    if direcionar:
        return {"tipo": "direcionada", "texto": f"Você disse \"{termo}\". Refere-se a {significado}?"}
    return {"tipo": "aberta", "texto": f"Não reconheci o termo \"{termo}\". A que você se refere?"}


def registrar(cur, termo, pergunta, resposta, significado=None, confirmou=None):
    """Grava a evidência e atualiza as contagens. `significado` vem da interpretação da resposta aberta."""
    resposta = resposta.strip()[:200]
    cur.execute("INSERT INTO conhecimento.termo (termo, significado) VALUES (%s, %s) ON CONFLICT (termo) DO NOTHING",
                (termo, significado))
    if confirmou is True or (confirmou is None and significado):
        cur.execute("""UPDATE conhecimento.termo SET confirmacoes = confirmacoes + 1, ultimo_visto = now(),
                       significado = coalesce(significado, %s) WHERE termo = %s""", (significado, termo))
    elif confirmou is False:
        cur.execute("UPDATE conhecimento.termo SET negacoes = negacoes + 1, ultimo_visto = now() WHERE termo = %s", (termo,))
    cur.execute("INSERT INTO conhecimento.termo_evidencia (termo, pergunta, resposta, confirmou) VALUES (%s, %s, %s, %s)",
                (termo, pergunta, resposta, confirmou))


def expandir(cur, texto):
    """Texto para a busca: acrescenta o sentido dos termos confirmados integralmente (zap -> zap whatsapp)."""
    extras = [s for (s,) in cur.execute(
        "SELECT significado FROM conhecimento.termo WHERE status = 'confirmado_integral' AND termo = ANY(%s)",
        ([normalizar(p) for p in PALAVRA.findall(texto)],))]
    return texto + (" " + " ".join(extras) if extras else "")


if __name__ == "__main__":
    from db import conectar
    con = conectar("motor"); cur = con.cursor()
    try:
        termo = "zzteste"
        assert termo in desconhecidos(cur, f"quero falar pelo {termo} da associação")
        assert pergunta_para(cur, termo)["tipo"] == "aberta"
        for _ in range(MIN_CONFIRMACOES):
            registrar(cur, termo, "aberta", "é o whatsapp", significado="WhatsApp (aplicativo de mensagens)")
        p = pergunta_para(cur, termo)
        assert p["tipo"] == "direcionada" and "WhatsApp" in p["texto"], p
        registrar(cur, termo, p["texto"], "não", confirmou=False)
        registrar(cur, termo, p["texto"], "não", confirmou=False)
        assert pergunta_para(cur, termo)["tipo"] == "aberta", "muitas negações deveria voltar a perguntar aberto"
        try:
            cur.execute("UPDATE conhecimento.termo SET status = 'confirmado_integral' WHERE termo = %s", (termo,))
            raise AssertionError("FALHA: motor conseguiu confirmar termo sozinho")
        except Exception as e:
            assert "permission denied" in str(e), e
        print("check ok: aberta -> direcionada -> volta a aberta com negações; motor não confirma sozinho")
    finally:
        con.rollback(); con.close()
