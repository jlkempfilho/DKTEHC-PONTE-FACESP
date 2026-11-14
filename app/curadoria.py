"""Painel da curadoria (/curadoria): tudo que entra no atendimento passa por aqui.
- Trilhas: sobe POP/IT/manual, o sistema propõe a trilha com o trecho de origem de cada etapa; a curadoria edita, responde lacunas e aprova.
- Documentos: o que o associado mandou numa trilha; aceitar ou devolver com motivo avisa a conversa.
- Soluções: inclui solução no catálogo direto, ou aprova a que uma startup cadastrou.
Mesma chave do curador (ADMIN_TOKEN); papel de banco admin_catalogo."""
import json
from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field
from admin import autorizado
from db import pool
import trilhas

router = APIRouter(prefix="/curadoria/api", dependencies=[Depends(autorizado)])
MAX_ARQUIVO = 5 * 1024 * 1024


# ---------- trilhas ----------
@router.post("/trilhas/propor")
async def propor(arquivo: UploadFile = File(...)):
    dados = await arquivo.read(MAX_ARQUIVO + 1)
    if len(dados) > MAX_ARQUIVO:
        raise HTTPException(413, "Arquivo acima de 5 MB.")
    texto = trilhas.texto_de_arquivo(arquivo.filename or "", dados).strip()
    if len(texto) < 50:
        raise HTTPException(422, "Não consegui ler texto nesse arquivo (PDF escaneado precisa de OCR).")
    try:
        p = trilhas.propor(texto, arquivo.filename or "procedimento")
    except trilhas.ErroLLM:
        raise HTTPException(503, "O modelo não respondeu agora. Tente de novo.")
    with pool("admin_catalogo").connection() as con:
        con.execute("""INSERT INTO trilha.trilha (id, nome, tipo, gatilhos, etapas, lacunas, fonte_nome, fonte_texto)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, tipo = EXCLUDED.tipo, gatilhos = EXCLUDED.gatilhos,
                         etapas = EXCLUDED.etapas, lacunas = EXCLUDED.lacunas, fonte_nome = EXCLUDED.fonte_nome,
                         fonte_texto = EXCLUDED.fonte_texto, status = 'pendente', versao = trilha.trilha.versao + 1""",
                    (p["id"], p["nome"], p["tipo"], p["gatilhos"], Jsonb(p["etapas"]), Jsonb(p["lacunas"]), arquivo.filename, texto))
    return p


@router.get("/trilhas")
def listar_trilhas():
    with pool("admin_catalogo").connection() as con:
        cols = ("id", "nome", "tipo", "gatilhos", "etapas", "lacunas", "fonte_nome", "fonte_texto", "status", "versao", "aprovada_por", "aprovada_em")
        return [dict(zip(cols, r)) for r in con.execute(f"SELECT {', '.join(cols)} FROM trilha.trilha ORDER BY status = 'pendente' DESC, criada_em DESC")]


class Etapa(BaseModel):
    id: str = Field(pattern=r"^e\d{1,3}$")
    tipo: Literal["pergunta", "documento", "analise", "informacao", "fim"]
    texto: str = Field(min_length=2, max_length=1000)
    documento: str | None = Field(default=None, max_length=200)
    trecho_origem: str | None = Field(default=None, max_length=2000)
    confere: bool = False


class Lacuna(BaseModel):
    pergunta: str = Field(max_length=300)
    resposta: str | None = Field(default=None, max_length=1000)


class Decisao(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    gatilhos: list[str] = Field(max_length=15)
    etapas: list[Etapa] = Field(min_length=1, max_length=40)
    lacunas: list[Lacuna] = Field(default=[], max_length=20)
    status: Literal["aprovada", "rejeitada", "pendente"]


@router.put("/trilhas/{tid}")
def decidir(tid: str, d: Decisao):
    if d.status == "aprovada" and any(not l.resposta for l in d.lacunas):
        raise HTTPException(422, "Responda as lacunas antes de aprovar: o atendimento não pode inventar o que o procedimento não diz.")
    with pool("admin_catalogo").connection() as con:
        n = con.execute("""UPDATE trilha.trilha SET nome = %s, gatilhos = %s, etapas = %s, lacunas = %s, status = %s,
                           aprovada_por = CASE WHEN %s = 'aprovada' THEN 'curadoria' END, aprovada_em = CASE WHEN %s = 'aprovada' THEN now() END
                           WHERE id = %s""",
                        (d.nome, d.gatilhos, Jsonb([e.model_dump() for e in d.etapas]), Jsonb([l.model_dump() for l in d.lacunas]),
                         d.status, d.status, d.status, tid)).rowcount
        if not n:
            raise HTTPException(404, "Trilha não encontrada.")
        con.commit()
    # trilha aprovada vira item do catálogo: a busca e o classificador passam a reconhecer o pedido do associado
    import carga_catalogo, embeddings
    hoje = date.today().isoformat()
    docs = [{"nome": e.documento or e.texto[:80], "obrigatorio": True} for e in d.etapas if e.tipo == "documento"]
    carga_catalogo.carregar([{"id": f"trilha-{tid}"[:80], "nome": d.nome, "descricao": f"Processo da associação: {d.nome}.",
                              "assuntos": d.gatilhos, "atribuicao": "Associação comercial (processo com trilha aprovada pela curadoria).",
                              "limites": None, "territorio": [{"municipio": "todos", "unidade": "Associação comercial"}],
                              "canais": [{"tipo": "WhatsApp", "valor": "este mesmo canal"}], "documentos": docs, "urgencia": "",
                              "encaminhamento": "O atendimento conduz a trilha passo a passo.", "horarios": None,
                              "fonte_url": "https://catalogo.exemplo.com.br/trilhas", "fonte_data": hoje, "vigencia": hoje}])
    if d.status != "aprovada":
        with pool("admin_catalogo").connection() as con:
            con.execute("UPDATE catalogo.servico SET ativo = false WHERE id = %s", (f"trilha-{tid}"[:80],))
    embeddings.rodar()
    return {"ok": True}


# ---------- documentos enviados nas trilhas ----------
@router.get("/documentos")
def documentos(status: str = "em_analise"):
    with pool("admin_catalogo").connection() as con:
        rs = con.execute("""SELECT d.id, d.trilha_id, t.nome, d.etapa_id, d.nome, d.status, d.motivo, d.enviado_em
                            FROM trilha.documento d JOIN trilha.trilha t ON t.id = d.trilha_id WHERE d.status = %s ORDER BY d.enviado_em""", (status,)).fetchall()
    return [dict(zip(("id", "trilha", "trilha_nome", "etapa", "documento", "status", "motivo", "enviado_em"), r)) for r in rs]


@router.get("/documentos/{did}/arquivo")
def arquivo(did: int):
    with pool("admin_catalogo").connection() as con:
        r = con.execute("SELECT tipo_mime, conteudo FROM trilha.documento WHERE id = %s", (did,)).fetchone()
    if not r:
        raise HTTPException(404, "Documento não encontrado.")
    return Response(bytes(r[1]), media_type=r[0], headers={"Content-Disposition": "inline", "X-Content-Type-Options": "nosniff"})


class Analise(BaseModel):
    status: Literal["aceito", "devolvido"]
    motivo: str | None = Field(default=None, max_length=500)


@router.post("/documentos/{did}")
def analisar(did: int, a: Analise):
    if a.status == "devolvido" and not a.motivo:
        raise HTTPException(422, "Diga o motivo da devolução: o associado precisa saber o que corrigir.")
    with pool("admin_catalogo").connection() as con:
        r = con.execute("""UPDATE trilha.documento SET status = %s, motivo = %s, analisado_em = now() WHERE id = %s AND status = 'em_analise'
                           RETURNING sessao, trilha_id, nome""", (a.status, a.motivo, did)).fetchone()
        if not r:
            raise HTTPException(404, "Documento não encontrado ou já analisado.")
        texto = (f"Boa notícia: o documento \"{r[2]}\" foi aceito pela associação." if a.status == "aceito"
                 else f"O documento \"{r[2]}\" foi devolvido pela associação. Motivo: {a.motivo} Pode mandar de novo por aqui.")
        con.execute("INSERT INTO trilha.evento (sessao, trilha_id, texto) VALUES (%s, %s, %s)", (r[0], r[1], texto))
        import protocolo
        p = con.execute("SELECT protocolo FROM atendimento.solicitacao WHERE tipo = 'trilha' AND sessao = %s AND referencia = %s AND status <> 'concluida' "
                        "ORDER BY criada_em DESC LIMIT 1", (r[0], r[1])).fetchone()
        if p:
            protocolo.mudar(con, p[0], "em_andamento" if a.status == "aceito" else "aguardando_associado",
                            f"documento {r[2]} {'aceito' if a.status == 'aceito' else 'devolvido: ' + (a.motivo or '')}", por="curadoria")
    return {"ok": True}


# ---------- soluções ----------
class Solucao(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9-]{2,60}$")
    nome: str = Field(min_length=3, max_length=120)
    empresa: str = Field(min_length=2, max_length=120)
    problema: str = Field(min_length=10, max_length=600)
    publico: str = Field(min_length=3, max_length=300)
    assuntos: list[str] = Field(min_length=1, max_length=15)
    requisitos: list[str] = Field(default=[], max_length=10)
    maturidade: str = Field(min_length=3, max_length=300)
    teste: str = Field(min_length=5, max_length=400)
    custo: str = Field(min_length=2, max_length=120)
    demonstracao: str = Field(pattern=r"^https://", max_length=300)


def _item(s: Solucao):
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "carga"))
    from gerar_catalogo import sol
    item = sol(s.id, s.nome, s.problema, s.publico, s.assuntos, s.empresa, s.requisitos, s.maturidade, s.teste, s.custo)
    item["canais"] = [{"tipo": "demonstração", "valor": s.demonstracao}]
    item["fonte_data"] = item["vigencia"] = date.today().isoformat()
    return item


@router.post("/solucoes")
def incluir(s: Solucao):
    import carga_catalogo, embeddings
    carga_catalogo.carregar([_item(s)])
    embeddings.rodar()
    return {"ok": True}


@router.get("/solucoes/propostas")
def propostas():
    with pool("admin_catalogo").connection() as con:
        rs = con.execute("SELECT id, startup, dados, status, criada_em FROM trilha.proposta_solucao ORDER BY status = 'pendente' DESC, criada_em DESC").fetchall()
    return [dict(zip(("id", "startup", "dados", "status", "criada_em"), r)) for r in rs]


@router.post("/solucoes/propostas/{pid}")
def decidir_proposta(pid: int, status: Literal["aprovada", "rejeitada"] = Form(...)):
    with pool("admin_catalogo").connection() as con:
        r = con.execute("UPDATE trilha.proposta_solucao SET status = %s WHERE id = %s AND status = 'pendente' RETURNING dados", (status, pid)).fetchone()
        if not r:
            raise HTTPException(404, "Proposta não encontrada ou já decidida.")
        con.commit()
    if status == "aprovada":
        incluir(Solucao(**r[0]))
    return {"ok": True}
