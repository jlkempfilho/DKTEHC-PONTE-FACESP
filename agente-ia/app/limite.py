"""Limite de tentativas de chave erradas por IP (painel do curador, API de envio, atendimento).

10 erros em 15 minutos bloqueiam o IP por 15 minutos (429), mesmo com a chave certa: força bruta fica inviável.
ponytail: memória de um processo; produção: Redis/tabela compartilhada entre réplicas (como o limite do chat).
"""
import time
from collections import defaultdict, deque
from fastapi import HTTPException

JANELA, MAX_ERROS = 15 * 60, 10
ERROS: dict[tuple[str, str], deque] = defaultdict(deque)


def _ip(request):
    return request.client.host if request and request.client else "?"


def checar(porta, request):
    """Chame antes de conferir a chave."""
    fila, agora = ERROS[(porta, _ip(request))], time.time()
    while fila and fila[0] < agora - JANELA:
        fila.popleft()
    if len(fila) >= MAX_ERROS:
        raise HTTPException(429, "Muitas tentativas com chave errada. Aguarde 15 minutos.")


def falhou(porta, request):
    """Chame quando a chave estiver errada."""
    ERROS[(porta, _ip(request))].append(time.time())


if __name__ == "__main__":
    class R:
        class client: host = "1.2.3.4"
    for _ in range(MAX_ERROS):
        checar("t", R); falhou("t", R)
    try:
        checar("t", R); raise AssertionError("não bloqueou")
    except HTTPException as e:
        assert e.status_code == 429
    checar("outra", R)   # porta diferente não é afetada
    print("limite ok")
