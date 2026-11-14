"""Prova do CAN.4 sem conta na Meta: assinatura, verificação do webhook, texto ponta a ponta no motor, sessão e tipo não suportado.

python app/check_whatsapp.py   (envio à Meta simulado; o motor e o banco são os reais)
"""
import hashlib, hmac
import whatsapp

SEGREDO, VERIFICA = "segredo-de-teste", "verifica-de-teste"
_env_real = whatsapp._env
whatsapp._env = lambda: {**_env_real(), "WHATSAPP_APP_SECRET": SEGREDO, "WHATSAPP_VERIFY_TOKEN": VERIFICA}

corpo = b'{"entry":[]}'
assin = "sha256=" + hmac.new(SEGREDO.encode(), corpo, hashlib.sha256).hexdigest()
assert whatsapp.assinatura_ok(corpo, assin)
assert not whatsapp.assinatura_ok(corpo, "sha256=" + "0" * 64)
assert not whatsapp.assinatura_ok(corpo + b" ", assin), "corpo alterado tem de falhar"
assert not whatsapp.assinatura_ok(corpo, "")


class Req:
    def __init__(self, q): self.query_params = q


assert whatsapp.verificar(Req({"hub.mode": "subscribe", "hub.verify_token": VERIFICA, "hub.challenge": "123"})).body == b"123"
try:
    whatsapp.verificar(Req({"hub.mode": "subscribe", "hub.verify_token": "errado", "hub.challenge": "123"})); raise AssertionError("aceitou token errado")
except whatsapp.HTTPException as x:
    assert x.status_code == 403

saidas = []
enviar = lambda para, texto: saidas.append((para, texto))
numero = "5551999990000"   # número fictício de teste
whatsapp.processar({"from": numero, "type": "text", "text": {"body": "Qual o telefone geral do Ministério Público do RS?"}}, enviar)
assert saidas[-1][0] == numero and "3295-1100" in saidas[-1][1], saidas[-1]
chave = whatsapp._chave(numero)
assert numero not in chave and chave in whatsapp.SESSOES, "sessão por hash, nunca pelo número"
assert whatsapp.SESSOES[chave][1].get("historico"), "contexto da conversa guardado"
from db import pool
with pool("admin_catalogo").connection() as con:   # a conversa do WhatsApp é gravada como whatsapp, não web
    assert con.execute("SELECT canal FROM atendimento.conversa WHERE id = %s", (whatsapp.SESSOES[chave][1]["conversa_id"],)).fetchone()[0] == "whatsapp"
whatsapp.processar({"from": numero, "type": "image", "image": {"id": "x"}}, enviar)
assert "texto e áudio" in saidas[-1][1]
print("check whatsapp ok: assinatura, verificação, texto no motor, sessão por hash, canal gravado como whatsapp, tipo não suportado")
