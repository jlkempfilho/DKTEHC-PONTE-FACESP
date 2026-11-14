"""Modo demonstração do hackathon: DEMO_ABERTO=true no .env abre painel do curador, fila de atendimento e tela da startup sem chave.
Padrão fechado. ponytail: chave liga/desliga global; para uso real, deixar false (as chaves continuam valendo)."""
from db import _env


def aberto():
    return (_env().get("DEMO_ABERTO") or "").strip().lower() == "true"
