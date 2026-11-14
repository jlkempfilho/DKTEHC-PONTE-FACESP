"""CAN.1 - API e chat web do atendimento. Motor desacoplado do canal: web, WhatsApp e outros sistemas usam o mesmo POST /api/atender.

Rodar: .venv/Scripts/python -m uvicorn api:app --app-dir app --host 127.0.0.1 --port 8090
"""
import secrets, time
from collections import defaultdict, deque
from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, Field
from motor import atender, PERSONA, TEXTO, SIM
import stt
import admin
import whatsapp
import atendimento
import startup
import curadoria
import painel as paineis
import demo

WEB = Path(__file__).resolve().parent.parent / "web"
app = FastAPI(title="Hackathon Connect 7.0 - atendimento da associação", docs_url=None, redoc_url=None, openapi_url="/api/openapi.json")
app.include_router(admin.router)
import threading


def _aquecer_modelos():   # o LLM e os embeddings sobem junto com a API: a 1a pergunta não paga 10 a 40 s de carga
    try:
        from llm import gerar_json
        from embeddings import vetorizar
        vetorizar(["aquecimento"]); gerar_json("Responda JSON {\"ok\": true}", "aquecimento")
    except Exception:
        pass   # modelo fora do ar: o atendimento já tem falha controlada


threading.Thread(target=_aquecer_modelos, daemon=True).start()
app.include_router(admin.ingest)
app.include_router(whatsapp.router)   # CAN.4
app.include_router(atendimento.router)   # fila de handoff, login próprio
app.include_router(startup.router)   # percurso 2: demandas para startups
app.include_router(curadoria.router)   # trilhas (POP), documentos, soluções
app.include_router(paineis.router)   # painéis da FACESP e das associações

# ponytail: estado e limite em memória de um processo só. Produção: Redis (ou tabela) para sessão e limite por IP compartilhado.
SESSOES: dict[str, tuple[float, dict]] = {}
TTL_SESSAO = 30 * 60
JANELA, MAX_REQ = 60, 20            # até 20 mensagens por minuto por IP (superfície pública: anexo D3 item 4-f)
PEDIDOS: dict[str, deque] = defaultdict(deque)


class Entrada(BaseModel):
    mensagem: str = Field(min_length=1, max_length=2000)
    municipio: str | None = Field(default=None, max_length=60)
    sessao: str | None = Field(default=None, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")


@app.middleware("http")
async def cabecalhos_seguranca(request: Request, call_next):
    r = await call_next(request)
    r.headers.update({"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
                      "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                                                 "font-src https://fonts.gstatic.com; img-src 'self' data:"})
    return r


def limitar(ip):
    agora = time.time(); fila = PEDIDOS[ip]
    while fila and fila[0] < agora - JANELA:
        fila.popleft()
    if len(fila) >= MAX_REQ:
        raise HTTPException(429, "Muitas mensagens em pouco tempo. Aguarde um minuto e tente de novo.")
    fila.append(agora)


def _sessao(sid):
    agora = time.time()
    for k in [k for k, (t, _) in SESSOES.items() if t < agora - TTL_SESSAO]:
        SESSOES.pop(k, None)
    sid = sid if sid in SESSOES else secrets.token_urlsafe(16)
    return sid, SESSOES.get(sid, (0, {}))[1]


def _responder(sid, mensagem, municipio, contexto, extra=None):
    # áudio aguardando confirmação: "sim" confirma a transcrição; outra resposta vale como a mensagem corrigida
    pend = contexto.pop("audio_pendente", None)
    if pend:
        mensagem = pend if SIM.search(mensagem) and len(mensagem) < 25 else mensagem
    contexto["sessao"] = sid   # eventos da curadoria (documento aceito) chegam por sessão
    s = atender(mensagem, municipio or None, contexto=contexto)
    s["contexto"]["ultima_resposta"] = s["resposta"]   # /api/voz só lê esta: não vira leitor de texto qualquer
    SESSOES[sid] = (time.time(), s["contexto"])
    return JSONResponse({"sessao": sid, "resposta": s["resposta"], "tipo": s["tipo"], "humano": s["humano"],
                         "servico": s.get("servico"), **(extra or {})})   # nunca devolve contexto interno nem trechos crus


@app.post("/api/atender")
def api_atender(e: Entrada, request: Request):
    limitar(request.client.host if request.client else "?")
    sid, contexto = _sessao(e.sessao)
    return _responder(sid, e.mensagem, e.municipio, contexto)


@app.post("/api/audio")
async def api_audio(request: Request, audio: UploadFile = File(...), municipio: str | None = Form(None), sessao: str | None = Form(None)):
    limitar(request.client.host if request.client else "?")
    if not (audio.content_type or "").startswith(("audio/", "video/webm")):
        raise HTTPException(415, "Envie um arquivo de áudio.")
    dados = await audio.read(stt.LIMITE_BYTES + 1)
    if len(dados) > stt.LIMITE_BYTES:
        raise HTTPException(413, "Áudio muito longo. Envie até 10 MB, ou escreva a mensagem.")
    if municipio and len(municipio) > 60:
        raise HTTPException(422, "Cidade inválida.")
    sid, contexto = _sessao(sessao if sessao and sessao.replace("-", "").replace("_", "").isalnum() else None)
    contexto.setdefault("canal", "voz")   # conversa que começa por áudio no site; o canal da 1a mensagem vale para a conversa
    try:
        tr = stt.transcrever(dados, audio.filename or "audio.webm")
    except Exception:
        raise HTTPException(503, "Não consegui ouvir o áudio agora. Pode escrever a mensagem?")
    if tr["sem_fala"]:
        SESSOES[sid] = (time.time(), contexto)
        return JSONResponse({"sessao": sid, "transcricao": "", "tipo": "audio_vazio", "humano": False,
                             "resposta": "Não consegui ouvir nada no áudio. Pode gravar de novo, mais perto do microfone, ou escrever?"})
    if tr["confianca"] < stt.LIMIAR_CONFIANCA:   # anexo D3 item k: confirma antes de agir sobre transcrição duvidosa
        contexto["audio_pendente"] = tr["texto"]
        SESSOES[sid] = (time.time(), contexto)
        return JSONResponse({"sessao": sid, "transcricao": tr["texto"], "tipo": "confirmar_audio", "humano": False, "confianca": tr["confianca"],
                             "resposta": f"Entendi assim: \"{tr['texto']}\". Está certo? Se não estiver, pode me corrigir escrevendo."})
    return _responder(sid, tr["texto"], municipio, contexto, {"transcricao": tr["texto"], "confianca": tr["confianca"]})


@app.post("/api/documento")
async def api_documento(request: Request, sessao: str = Form(...), arquivo: UploadFile = File(...)):
    """Documento da etapa atual de uma trilha (foto ou PDF). No WhatsApp é a mídia recebida; aqui, o clipe do chat."""
    limitar(request.client.host if request.client else "?")
    if sessao not in SESSOES:
        raise HTTPException(404, "Conversa não encontrada.")
    mime = (arquivo.content_type or "").lower()
    if mime not in ("application/pdf", "image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Mande o documento em PDF ou foto (JPG, PNG).")
    dados = await arquivo.read(5 * 1024 * 1024 + 1)
    if len(dados) > 5 * 1024 * 1024:
        raise HTTPException(413, "Arquivo acima de 5 MB.")
    contexto = SESSOES[sessao][1]
    contexto["sessao"] = sessao
    import conducao
    from db import pool
    with pool("motor").connection() as con, con.cursor() as cur:
        resposta = conducao.receber_documento(cur, contexto, arquivo.filename or "documento", mime, dados)
    if not resposta:
        raise HTTPException(409, "Agora não estou esperando um documento.")
    contexto["ultima_resposta"] = resposta
    SESSOES[sessao] = (time.time(), contexto)
    return {"sessao": sessao, "resposta": resposta, "tipo": "trilha", "humano": False}


@app.get("/api/voz")
def api_voz(sessao: str, parte: int = 0):
    """Sem voz no servidor: a página usa a voz do aparelho."""
    raise HTTPException(404, "Voz do aparelho.")


@app.get("/api/demo")
def modo_demo():
    return {"aberto": demo.aberto()}


@app.get("/api/persona")
def persona():
    return {"nome": PERSONA["nome"], "saudacao": TEXTO["persona"]}


@app.get("/")
def pagina():
    return FileResponse(WEB / "index.html")


@app.get("/painel")
def pagina_painel():
    return FileResponse(WEB / "painel.html")


@app.get("/painel.js")
def js_painel():
    return FileResponse(WEB / "painel.js", media_type="text/javascript")


@app.get("/curadoria")
def pagina_curadoria():
    return FileResponse(WEB / "curadoria.html")


@app.get("/curadoria.js")
def js_curadoria():
    return FileResponse(WEB / "curadoria.js", media_type="text/javascript")


@app.get("/startup.js")
def js_startup():
    return FileResponse(WEB / "startup.js", media_type="text/javascript")


@app.get("/startup")
def pagina_startup():
    return FileResponse(WEB / "startup.html")


@app.get("/admin")
def painel():
    return FileResponse(WEB / "admin.html")


@app.get("/atendimento")
def pagina_atendimento():
    return FileResponse(WEB / "atendimento.html")


@app.get("/atendimento.js")
def js_atendimento():
    return FileResponse(WEB / "atendimento.js", media_type="text/javascript")


@app.get("/admin.js")
def painel_js():
    return FileResponse(WEB / "admin.js", media_type="text/javascript")


@app.get("/app.js")
def script():
    return FileResponse(WEB / "app.js", media_type="text/javascript")
