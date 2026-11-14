"""CAN.4 - canal WhatsApp (Cloud API oficial da Meta, número de teste no sandbox). Mesmo motor do web: nenhuma regra aqui.

Webhook:  GET  /whatsapp/webhook  verificação (hub.verify_token = WHATSAPP_VERIFY_TOKEN)
          POST /whatsapp/webhook  mensagens; assinatura X-Hub-Signature-256 conferida com WHATSAPP_APP_SECRET
Resposta: POST graph.facebook.com/<versão>/<WHATSAPP_PHONE_ID>/messages com WHATSAPP_TOKEN

Privacidade: o número do cidadão não é gravado; sessão e log usam HMAC do número. O motor grava a conversa como canal web.
ponytail: sessão e deduplicação em memória de um processo; produção: Redis ou tabela, como a sessão do web.
"""
import hashlib, hmac, json, time, urllib.request
from collections import OrderedDict
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import PlainTextResponse
from db import _env
from motor import atender, SIM
import stt

router = APIRouter(prefix="/whatsapp")
SESSOES: dict[str, tuple[float, dict]] = {}
VISTAS: OrderedDict[str, None] = OrderedDict()   # a Meta reenvia o mesmo evento se demoramos: processa uma vez
TTL = 30 * 60


def _graph(caminho, corpo=None, bruto=False):
    e = _env()
    url = caminho if caminho.startswith("https://") else f"https://graph.facebook.com/{e.get('WHATSAPP_GRAPH_VERSAO', 'v25.0')}/{caminho}"
    req = urllib.request.Request(url, data=json.dumps(corpo).encode() if corpo else None,
                                 headers={"Authorization": "Bearer " + e["WHATSAPP_TOKEN"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if bruto else json.loads(r.read())


def enviar(para, texto):
    _graph(f"{_env()['WHATSAPP_PHONE_ID']}/messages",
           {"messaging_product": "whatsapp", "to": para, "type": "text", "text": {"body": texto[:4096], "preview_url": True}})


def baixar_midia(media_id):
    info = _graph(media_id)                                   # 1) url temporária da mídia
    return _graph(info["url"], bruto=True), info.get("mime_type", "audio/ogg")   # 2) bytes (mesmo token)


def assinatura_ok(corpo: bytes, cabecalho: str) -> bool:
    segredo = (_env().get("WHATSAPP_APP_SECRET") or "").encode()
    esperado = "sha256=" + hmac.new(segredo, corpo, hashlib.sha256).hexdigest()
    return bool(segredo) and hmac.compare_digest(esperado, cabecalho or "")


def _chave(numero):
    return hmac.new((_env().get("WHATSAPP_APP_SECRET") or "x").encode(), numero.encode(), hashlib.sha256).hexdigest()[:24]


def processar(msg, enviar_fn=enviar, baixar_fn=baixar_midia):
    numero, tipo = msg["from"], msg.get("type")
    chave, agora = _chave(numero), time.time()
    for k in [k for k, (t, _) in SESSOES.items() if t < agora - TTL]:
        SESSOES.pop(k, None)
    contexto = SESSOES.get(chave, (0, {}))[1]
    contexto.setdefault("canal", "whatsapp")
    if tipo == "text":
        texto = msg["text"]["body"][:2000]
    elif tipo == "audio":
        try:
            dados, mime = baixar_fn(msg["audio"]["id"])
            tr = stt.transcrever(dados, "audio." + mime.split("/")[-1].split(";")[0])
        except Exception:
            return enviar_fn(numero, "Não consegui ouvir o áudio agora. Pode escrever a mensagem?")
        if tr["sem_fala"]:
            return enviar_fn(numero, "Não consegui ouvir nada no áudio. Pode gravar de novo ou escrever?")
        if tr["confianca"] < stt.LIMIAR_CONFIANCA:      # anexo D3 item k: confirma antes de agir
            contexto["audio_pendente"] = tr["texto"]; SESSOES[chave] = (agora, contexto)
            return enviar_fn(numero, f"Entendi assim: \"{tr['texto']}\". Está certo? Se não estiver, pode me corrigir escrevendo.")
        texto = tr["texto"]
    else:
        return enviar_fn(numero, "Por aqui eu entendo texto e áudio. Pode me escrever ou mandar um áudio?")
    pend = contexto.pop("audio_pendente", None)
    if pend and SIM.search(texto) and len(texto) < 25:
        texto = pend
    s = atender(texto, contexto.get("municipio"), contexto=contexto)
    SESSOES[chave] = (time.time(), s["contexto"])
    enviar_fn(numero, s["resposta"])


@router.get("/webhook")
def verificar(request: Request):
    q = request.query_params
    esperado = _env().get("WHATSAPP_VERIFY_TOKEN") or ""
    if q.get("hub.mode") == "subscribe" and esperado and hmac.compare_digest(q.get("hub.verify_token", ""), esperado):
        return PlainTextResponse(q.get("hub.challenge", ""))
    raise HTTPException(403, "Verificação recusada.")


@router.post("/webhook")
async def receber(request: Request, tarefas: BackgroundTasks):
    corpo = await request.body()
    if len(corpo) > 1_000_000 or not assinatura_ok(corpo, request.headers.get("X-Hub-Signature-256", "")):
        raise HTTPException(401, "Assinatura inválida.")   # só a Meta, com o segredo do app, chega aqui
    evento = json.loads(corpo)
    for entrada in evento.get("entry", []):
        for mudanca in entrada.get("changes", []):
            for msg in mudanca.get("value", {}).get("messages", []):   # "statuses" (entregue/lido) é ignorado
                if msg.get("id") in VISTAS:
                    continue
                VISTAS[msg["id"]] = None
                while len(VISTAS) > 5000:
                    VISTAS.popitem(last=False)
                tarefas.add_task(processar, msg)
    return {"ok": True}   # 200 rápido: a Meta reenvia o evento se a resposta demora
