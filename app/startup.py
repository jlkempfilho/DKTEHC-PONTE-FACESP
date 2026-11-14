"""Percurso 2, lado da startup: vê as demandas agrupadas (sem identificar lojista), pede esclarecimento
ou propõe adaptação/piloto. Token próprio (STARTUP_TOKEN), papel de banco da curadoria."""
import hmac
from typing import Literal
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from db import _env, pool
import limite
import demo

router = APIRouter(prefix="/startup/api")


def autorizado(request: Request, authorization: str = Header(default="")):
    if demo.aberto():
        return
    limite.checar("startup", request)
    esperado = _env().get("STARTUP_TOKEN") or ""
    if not esperado or not hmac.compare_digest(authorization.removeprefix("Bearer ").strip(), esperado):
        limite.falhou("startup", request)
        raise HTTPException(401, "Acesso restrito a startups cadastradas.")


@router.get("/demandas", dependencies=[Depends(autorizado)])
def demandas():
    """Um item por grupo: a ficha mais completa + quantas lojas relataram + respostas já dadas."""
    with pool("admin_catalogo").connection() as con:
        grupos = con.execute("""
            SELECT grupo_id, count(*) AS lojas, max(criada_em) AS ultimo,
                   array_agg(DISTINCT segmento), array_agg(DISTINCT territorio) FILTER (WHERE territorio IS NOT NULL),
                   (array_agg(problema ORDER BY length(problema) DESC))[1], (array_agg(pratica_atual ORDER BY criada_em))[1],
                   array_agg(DISTINCT sistemas) FILTER (WHERE sistemas IS NOT NULL), array_agg(DISTINCT restricoes) FILTER (WHERE restricoes IS NOT NULL),
                   (array_agg(resultado_esperado ORDER BY criada_em))[1], array_agg(DISTINCT frequencia) FILTER (WHERE frequencia IS NOT NULL),
                   array_agg(DISTINCT canal_venda) FILTER (WHERE canal_venda IS NOT NULL), min(status)
            FROM demanda.ficha GROUP BY grupo_id ORDER BY count(*) DESC, max(criada_em) DESC LIMIT 100""").fetchall()
        respostas = con.execute("SELECT grupo_id, startup, tipo, texto, criada_em, responsavel, proximo_passo, indicador, ponto_partida, resultado_esperado "
                                "FROM demanda.resposta ORDER BY criada_em").fetchall()
    chaves = ("grupo", "lojas", "ultimo", "segmentos", "territorios", "problema", "pratica_atual", "sistemas", "restricoes",
              "resultado_esperado", "frequencia", "canais", "status")
    out = [dict(zip(chaves, g)) for g in grupos]
    for d in out:
        d["codigo"] = f"D-{d['grupo']:04d}"
        d["respostas"] = [dict(zip(("startup", "tipo", "texto", "em", "responsavel", "proximo_passo", "indicador", "ponto_partida", "resultado_esperado"), r[1:]))
                          for r in respostas if r[0] == d["grupo"]]
    return out


class Resposta(BaseModel):
    startup: str = Field(min_length=2, max_length=80)
    tipo: Literal["esclarecimento", "adaptacao", "piloto"]
    texto: str = Field(min_length=5, max_length=2000)
    responsavel: str | None = Field(default=None, max_length=120)
    proximo_passo: str | None = Field(default=None, max_length=500)
    indicador: str | None = Field(default=None, max_length=300)
    ponto_partida: str | None = Field(default=None, max_length=300)
    resultado_esperado: str | None = Field(default=None, max_length=300)


@router.post("/demandas/{grupo}/respostas", dependencies=[Depends(autorizado)])
def responder(grupo: int, r: Resposta):
    if r.tipo == "piloto" and not (r.responsavel and r.proximo_passo and r.indicador):
        raise HTTPException(422, "Piloto precisa de responsável, próximo passo e indicador.")
    with pool("admin_catalogo").connection() as con:
        if not con.execute("SELECT 1 FROM demanda.ficha WHERE grupo_id = %s LIMIT 1", (grupo,)).fetchone():
            raise HTTPException(404, "Demanda não encontrada.")
        con.execute("INSERT INTO demanda.resposta (grupo_id, startup, tipo, texto, responsavel, proximo_passo, indicador, ponto_partida, resultado_esperado) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (grupo, r.startup, r.tipo, r.texto, r.responsavel, r.proximo_passo, r.indicador, r.ponto_partida, r.resultado_esperado))
        novo = {"esclarecimento": "em_avaliacao", "adaptacao": "em_avaliacao", "piloto": "piloto"}[r.tipo]
        con.execute("UPDATE demanda.ficha SET status = %s WHERE grupo_id = %s AND status <> 'atendida'", (novo, grupo))
        import protocolo
        for (p,) in con.execute("SELECT s.protocolo FROM atendimento.solicitacao s JOIN demanda.ficha f ON s.tipo = 'demanda' AND s.referencia = f.id::text "
                                "WHERE f.grupo_id = %s AND s.status NOT IN ('concluida','cancelada')", (grupo,)).fetchall():
            protocolo.mudar(con, p, "em_andamento", {"esclarecimento": "startup pediu esclarecimento", "adaptacao": "startup propôs adaptação",
                                                     "piloto": "startup propôs projeto-piloto"}[r.tipo] + f" ({r.startup})", por="startup")
    return {"ok": True}


@router.post("/solucoes", dependencies=[Depends(autorizado)])
def cadastrar_solucao(s: dict):
    """A startup cadastra uma solução; ela só entra no catálogo depois que a curadoria aprova (/curadoria)."""
    from curadoria import Solucao
    from psycopg.types.json import Jsonb
    sol = Solucao(**s)
    with pool("admin_catalogo").connection() as con:
        pid = con.execute("INSERT INTO trilha.proposta_solucao (startup, dados) VALUES (%s, %s) RETURNING id",
                          (sol.empresa, Jsonb(sol.model_dump()))).fetchone()[0]
    return {"ok": True, "proposta": pid}
