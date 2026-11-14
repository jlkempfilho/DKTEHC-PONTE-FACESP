"""Painéis (/painel). FACESP: demandas por região e município, lacunas de oferta, status e tempos (base para SLA).
Associação: fila por status (e mudança de status) e o que o atendimento não soube responder.
Só números agregados; município com menos de 3 casos aparece como "menos de 3" (evita identificar a loja em cidade pequena)."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from admin import autorizado
from db import normalizar, pool
import protocolo

router = APIRouter(prefix="/painel/api", dependencies=[Depends(autorizado)])
MINIMO = 3


def _ras(con):
    return {normalizar(c).replace("-", " "): ra for c, ra in con.execute("SELECT cidade, ra FROM rede.associacao")}


def _ra_de(mapa, municipio, ra):
    return ra or mapa.get(normalizar(municipio or "").replace("-", " ")) or "sem região informada"


@router.get("/regional")
def regional():
    with pool("admin_catalogo").connection() as con:
        mapa = _ras(con)
        rs = con.execute("SELECT municipio, ra, tema, origem FROM atendimento.solicitacao WHERE tipo = 'demanda'").fetchall()
    por_ra, por_mun, temas_ra = Counter(), Counter(), defaultdict(Counter)
    for mun, ra, tema, _ in rs:
        r = _ra_de(mapa, mun, ra)
        por_ra[r] += 1
        temas_ra[r][tema or "outros"] += 1
        if mun:
            por_mun[(r, mun.strip().title())] += 1
    return {"total": len(rs), "semente": sum(1 for x in rs if x[3] == "semente"),
            "por_ra": [{"ra": r, "demandas": n, "temas": temas_ra[r].most_common(5)} for r, n in por_ra.most_common()],
            "por_municipio": [{"ra": r, "municipio": m, "demandas": n if n >= MINIMO else "menos de 3"} for (r, m), n in por_mun.most_common(40)]}


@router.get("/lacunas")
def lacunas():
    """Demanda por tema e região x quantas associações da região oferecem algo desse tema (base raspada)."""
    with pool("admin_catalogo").connection() as con:
        mapa = _ras(con)
        dem = con.execute("SELECT municipio, ra, tema FROM atendimento.solicitacao WHERE tipo = 'demanda'").fetchall()
        oferta = con.execute("""SELECT a.ra, o.tema, count(DISTINCT a.slug) FROM rede.oferta o JOIN rede.associacao a USING (slug)
                                GROUP BY a.ra, o.tema""").fetchall()
        total_ra = dict(con.execute("SELECT ra, count(*) FROM rede.associacao GROUP BY ra").fetchall())
    of = {(ra, t): n for ra, t, n in oferta}
    d = Counter((_ra_de(mapa, m, ra), t or "outros") for m, ra, t in dem)
    linhas = [{"ra": ra, "tema": t, "demandas": n, "associacoes_com_oferta": of.get((ra, t), 0), "associacoes_na_ra": total_ra.get(ra, 0)}
              for (ra, t), n in d.most_common()]
    for l in linhas:
        l["lacuna"] = l["associacoes_com_oferta"] == 0
    return {"linhas": linhas, "lacunas": sum(l["lacuna"] for l in linhas)}


@router.get("/status")
def status():
    """Quantidade por status e tempo em cada passagem de status, por tipo de solicitação (base para definir SLA)."""
    with pool("admin_catalogo").connection() as con:
        cont = con.execute("SELECT tipo, status, count(*) FROM atendimento.solicitacao GROUP BY tipo, status").fetchall()
        hist = con.execute("""SELECT s.tipo, h.protocolo, h.de, h.para, h.em FROM atendimento.solicitacao_hist h
                              JOIN atendimento.solicitacao s USING (protocolo) ORDER BY h.protocolo, h.em""").fetchall()
        abertas = con.execute("""SELECT tipo, status, extract(epoch FROM now() - atualizada_em) / 3600 FROM atendimento.solicitacao
                                 WHERE status NOT IN ('concluida','cancelada')""").fetchall()
    tempos = defaultdict(list)
    anterior = {}
    for tipo, prot, de, para, em in hist:
        if prot in anterior:
            st, t0 = anterior[prot]
            tempos[(tipo, st)].append((em - t0).total_seconds() / 3600)
        anterior[prot] = (para, em)

    def pct(v, p):
        v = sorted(v)
        return round(v[min(len(v) - 1, int(len(v) * p))], 1) if v else None
    return {
        "por_tipo": [{"tipo": protocolo.TIPO.get(t, t), "status": protocolo.STATUS.get(s, s), "quantidade": n} for t, s, n in cont],
        "tempo_por_status": [{"tipo": protocolo.TIPO.get(t, t), "status": protocolo.STATUS.get(s, s), "casos": len(v),
                              "mediana_h": pct(v, 0.5), "p90_h": pct(v, 0.9)} for (t, s), v in sorted(tempos.items())],
        "parados_ha_mais_de_48h": sum(1 for _, _, h in abertas if h > 48),
    }


@router.get("/fila")
def fila():
    with pool("admin_catalogo").connection() as con:
        rs = con.execute("""SELECT protocolo, tipo, titulo, status, municipio, titular_final, criada_em, atualizada_em FROM atendimento.solicitacao
                            WHERE status NOT IN ('concluida','cancelada') ORDER BY atualizada_em LIMIT 300""").fetchall()
    agora = datetime.now(timezone.utc)
    return [{"protocolo": p, "tipo": protocolo.TIPO.get(t, t), "titulo": ti, "status": s, "status_nome": protocolo.STATUS.get(s, s),
             "municipio": m, "titular": f"final {f}" if f else "não vinculado", "idade_h": round((agora - a).total_seconds() / 3600, 1)}
            for p, t, ti, s, m, f, c, a in rs]


class Mudanca(BaseModel):
    status: Literal["aberta", "em_andamento", "aguardando_associado", "aguardando_associacao", "concluida", "cancelada"]
    motivo: str = Field(min_length=3, max_length=300)


@router.post("/fila/{prot}")
def mudar(prot: str, m: Mudanca):
    with pool("admin_catalogo").connection() as con:
        if not protocolo.mudar(con, prot, m.status, m.motivo, por="associação"):
            raise HTTPException(404, "Protocolo não encontrado ou já está nesse status.")
    return {"ok": True}


@router.get("/nao-soube")
def nao_soube():
    """Mensagens que o atendimento não conseguiu resolver (vago, fora do escopo, falha): o que falta cadastrar em POP ou catálogo."""
    with pool("admin_catalogo").connection() as con:
        semente = con.execute("SELECT count(*) FROM atendimento.conversa WHERE canal = 'api' AND criado_em > now() - interval '30 days'").fetchone()[0]
        rs = con.execute("""SELECT c.desfecho, m.conteudo, c.criado_em FROM atendimento.conversa c
                            JOIN atendimento.mensagem m ON m.conversa_id = c.id AND m.papel = 'cidadao'
                            WHERE c.desfecho IN ('abstencao', 'humano') AND c.criado_em > now() - interval '30 days'
                            ORDER BY c.criado_em DESC LIMIT 200""").fetchall()
    temas = Counter(protocolo.tema(t) for _, t, _ in rs)
    return {"total": len(rs), "semente": semente, "por_tema": temas.most_common(),
            "exemplos": [{"desfecho": "passou para pessoa" if d == "humano" else "não soube responder", "mensagem": t[:160]} for d, t, _ in rs[:25]]}
