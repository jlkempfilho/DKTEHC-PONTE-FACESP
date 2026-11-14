"""CAN.3 + CAN.5 - painel do curador da associação: catálogo (editar com versão e histórico), vocabulário (decidir termos),
lacunas (perguntas que o atendimento não resolveu) e indicadores agregados (sem dado pessoal).

Autenticação do protótipo: token em ADMIN_TOKEN (.env), cabeçalho "Authorization: Bearer <token>".
ponytail: token único de protótipo. Produção: Microsoft Entra ID (OIDC), como pede o Subanexo I-A item 6.
"""
import hmac, json
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from psycopg.types.json import Jsonb
from db import _env, pool
import curadoria_termos
import limite
import demo

router = APIRouter(prefix="/admin/api")
ingest = APIRouter(prefix="/api/v1")   # API.1: sistemas externos (associação, federação), token próprio


def autorizado(request: Request, authorization: str = Header(default="")):
    if demo.aberto():
        return
    limite.checar("curador", request)
    esperado = _env().get("ADMIN_TOKEN") or ""
    if not esperado or not hmac.compare_digest(authorization.removeprefix("Bearer ").strip(), esperado):
        limite.falhou("curador", request)
        raise HTTPException(401, "Acesso restrito ao curador.")


EDITAVEIS = ("nome", "descricao", "assuntos", "atribuicao", "limites", "canais", "documentos", "urgencia",
             "encaminhamento", "horarios", "fonte_url", "fonte_data", "ativo")


class Edicao(BaseModel):
    nome: str = Field(min_length=3, max_length=200)
    descricao: str = Field(min_length=10, max_length=2000)
    assuntos: list[str] = Field(max_length=40)
    atribuicao: str = Field(min_length=3, max_length=1000)
    limites: str | None = Field(default=None, max_length=1000)
    canais: list[dict] = Field(max_length=20)
    documentos: list[dict] = Field(max_length=30)
    urgencia: str | None = Field(default=None, max_length=1000)
    encaminhamento: str = Field(min_length=3, max_length=1000)
    horarios: str | None = Field(default=None, max_length=500)
    fonte_url: str = Field(pattern=r"^https://", max_length=500)
    fonte_data: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    ativo: bool = True


@router.get("/servicos", dependencies=[Depends(autorizado)])
def servicos():
    with pool("admin_catalogo").connection() as con:
        cols = ("id",) + EDITAVEIS + ("versao", "atualizado_por", "atualizado_em")
        linhas = con.execute(f"SELECT {', '.join(cols)} FROM catalogo.servico ORDER BY nome").fetchall()
        return [dict(zip(cols, l)) for l in linhas]


@router.put("/servicos/{sid}", dependencies=[Depends(autorizado)])
def editar(sid: str, e: Edicao):
    d = e.model_dump()
    d["canais"], d["documentos"] = Jsonb(d["canais"]), Jsonb(d["documentos"])
    with pool("admin_catalogo").connection() as con:
        n = con.execute(f"UPDATE catalogo.servico SET {', '.join(f'{c} = %({c})s' for c in d)}, embedding = NULL WHERE id = %(id)s",
                        {**d, "id": sid}).rowcount
        if not n:
            raise HTTPException(404, "Serviço não encontrado.")
        con.commit()
    # o vetor do serviço é recalculado na hora: a busca passa a refletir a edição
    import embeddings
    embeddings.rodar()
    return {"ok": True}


@router.get("/servicos/{sid}/historico", dependencies=[Depends(autorizado)])
def historico(sid: str):
    with pool("admin_catalogo").connection() as con:
        return [{"versao": v, "operacao": o, "ator": a, "em": str(em), "dados": dd} for v, o, a, em, dd in con.execute(
            "SELECT versao, operacao, ator, em, dados - 'embedding' FROM auditoria.servico_hist WHERE servico_id = %s ORDER BY em DESC LIMIT 50",
            (sid,))]


@router.get("/termos", dependencies=[Depends(autorizado)])
def termos():
    with pool("admin_catalogo").connection() as con:
        cols = ("termo", "significado", "status", "confirmacoes", "negacoes", "ultimo_visto")
        return [dict(zip(cols, l)) for l in con.execute(
            f"SELECT {', '.join(cols)} FROM conhecimento.termo ORDER BY status = 'aprendendo' DESC, confirmacoes + negacoes DESC")]


class Decisao(BaseModel):
    decisao: str = Field(pattern=r"^(integral|parcial|rejeitar)$")
    significado: str = Field(min_length=1, max_length=120)
    observacao: str | None = Field(default=None, max_length=500)


@router.post("/termos/{termo}", dependencies=[Depends(autorizado)])
def decidir(termo: str, d: Decisao):
    if not curadoria_termos.decidir(termo, d.decisao, d.significado, d.observacao):
        raise HTTPException(404, "Termo não encontrado.")
    return {"ok": True}


@router.get("/indicadores", dependencies=[Depends(autorizado)])
def indicadores():
    """Agregados para a gestão (anexo D3, resultado mínimo p): sem texto de mensagem e sem dado pessoal."""
    with pool("admin_catalogo").connection() as con:
        q = lambda sql: [dict(zip(("chave", "total"), l)) for l in con.execute(sql)]
        return {
            "conversas": con.execute("SELECT count(*) FROM atendimento.conversa").fetchone()[0],
            "por_desfecho": q("SELECT coalesce(desfecho, 'em aberto'), count(*) FROM atendimento.conversa GROUP BY 1 ORDER BY 2 DESC"),
            "por_servico": q("SELECT coalesce(servico_id, 'sem serviço'), count(*) FROM atendimento.conversa GROUP BY 1 ORDER BY 2 DESC LIMIT 20"),
            "por_municipio": q("SELECT coalesce(municipio, 'não informado'), count(*) FROM atendimento.conversa GROUP BY 1 ORDER BY 2 DESC LIMIT 20"),
            "urgentes": con.execute("SELECT count(*) FROM atendimento.conversa WHERE urgente").fetchone()[0],
            "por_dia": [{"chave": str(d), "total": n} for d, n in con.execute(
                "SELECT criado_em::date, count(*) FROM atendimento.conversa GROUP BY 1 ORDER BY 1 DESC LIMIT 30")],
        }


@router.get("/lacunas", dependencies=[Depends(autorizado)])
def lacunas():
    """Atendimentos sem serviço (abstenção ou vago): o que o catálogo ainda não cobre. Mostra só a 1ª mensagem, curta."""
    with pool("admin_catalogo").connection() as con:
        return [{"em": str(em), "mensagem": m} for em, m in con.execute(
            """SELECT c.criado_em, left(m.conteudo, 200) FROM atendimento.conversa c
               JOIN LATERAL (SELECT conteudo FROM atendimento.mensagem WHERE conversa_id = c.id AND papel = 'cidadao' ORDER BY criado_em LIMIT 1) m ON true
               WHERE c.desfecho = 'abstencao' ORDER BY c.criado_em DESC LIMIT 100""")]


# ---------- COL.3: curadoria de documentos coletados ou enviados ----------
@router.get("/documentos", dependencies=[Depends(autorizado)])
def documentos(curadoria: str = "pendente", limite: int = 50):
    if curadoria not in ("pendente", "aprovado", "rejeitado"):
        raise HTTPException(422, "Situação inválida.")
    with pool("admin_catalogo").connection() as con:
        cols = ("id", "titulo", "fonte_url", "natureza", "origem", "enviado_por", "trechos", "amostra")
        return [dict(zip(cols, l)) for l in con.execute(
            """SELECT d.id, d.titulo, d.fonte_url, d.natureza, d.origem, d.enviado_por,
                      (SELECT count(*) FROM conhecimento.trecho WHERE documento_id = d.id),
                      (SELECT left(conteudo, 300) FROM conhecimento.trecho WHERE documento_id = d.id ORDER BY ordem LIMIT 1)
               FROM conhecimento.documento d WHERE d.curadoria = %s
               ORDER BY d.origem = 'api_externa' DESC, d.coletado_em DESC LIMIT %s""", (curadoria, max(1, min(limite, 200))))]


class DecisaoDoc(BaseModel):
    decisao: str = Field(pattern=r"^(aprovado|rejeitado)$")
    motivo: str | None = Field(default=None, max_length=500)


@router.post("/documentos/{did}", dependencies=[Depends(autorizado)])
def decidir_documento(did: int, d: DecisaoDoc):
    if d.decisao == "rejeitado" and not (d.motivo or "").strip():
        raise HTTPException(422, "Rejeição precisa de motivo.")
    with pool("admin_catalogo").connection() as con:
        r = con.execute("SELECT curadoria FROM conhecimento.documento WHERE id = %s FOR UPDATE", (did,)).fetchone()
        if not r:
            raise HTTPException(404, "Documento não encontrado.")
        con.execute("UPDATE conhecimento.documento SET curadoria = %s WHERE id = %s", (d.decisao, did))
        con.execute("INSERT INTO auditoria.documento_decisao (documento_id, de, para, ator, motivo) VALUES (%s, %s, %s, 'curador', %s)",
                    (did, r[0], d.decisao, d.motivo))
        con.commit()
    return {"ok": True}


# ---------- API.1: entrada de conhecimento por sistema externo ----------
def envio_autorizado(request: Request, authorization: str = Header(default="")):
    """Token separado do curador: quem envia não aprova (segregação de função)."""
    limite.checar("envio", request)
    esperado = _env().get("INGEST_TOKEN") or ""
    if not esperado or not hmac.compare_digest(authorization.removeprefix("Bearer ").strip(), esperado):
        limite.falhou("envio", request)
        raise HTTPException(401, "Envio não autorizado.")


class Conhecimento(BaseModel):
    titulo: str = Field(min_length=3, max_length=300)
    fonte_url: str = Field(pattern=r"^https://", max_length=500)
    texto: str = Field(min_length=200, max_length=200_000)
    natureza: str = Field(default="oficial_entidade", pattern=r"^(oficial_entidade|oficial_outro_orgao|legislacao)$")
    sistema: str = Field(default="externo", pattern=r"^[a-z0-9_-]{2,40}$")   # quem enviou, vai para a auditoria


@ingest.post("/conhecimento", status_code=202, dependencies=[Depends(envio_autorizado)])
def receber(c: Conhecimento, tarefas: BackgroundTasks):
    """Entra em QUARENTENA: pendente e fora da busca até o curador aprovar no painel."""
    import hashlib
    from datetime import date
    from coletor import fracionar, qualidade
    hoje = date.today().isoformat()
    h = hashlib.sha256(c.texto.encode()).hexdigest()
    with pool("admin_catalogo").connection() as con:
        r = con.execute("""INSERT INTO conhecimento.documento (titulo, fonte_url, fonte_data, vigencia, conteudo_hash, origem, curadoria, natureza, tipo, enviado_por)
                           VALUES (%s, %s, %s, %s, %s, 'api_externa', 'pendente', %s, 'html', %s) ON CONFLICT (conteudo_hash) DO NOTHING RETURNING id""",
                        (c.titulo, c.fonte_url, hoje, f"[{hoje},)", h, c.natureza, c.sistema)).fetchone()
        if not r:
            return {"situacao": "ja_existe"}
        n = 0
        for i, t in enumerate(fracionar(c.texto)):
            if qualidade(t):
                con.execute("INSERT INTO conhecimento.trecho (documento_id, vigencia, ordem, conteudo) VALUES (%s, %s, %s, %s)", (r[0], f"[{hoje},)", i, t)); n += 1
        con.execute("INSERT INTO auditoria.documento_decisao (documento_id, para, ator) VALUES (%s, 'pendente', %s)", (r[0], "api:" + c.sistema))
        con.commit()
    import embeddings
    tarefas.add_task(embeddings.rodar)   # vetor já pronto quando o curador aprovar
    return {"situacao": "quarentena", "documento_id": r[0], "trechos": n}

