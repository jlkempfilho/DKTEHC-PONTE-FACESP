"""Conexão por papel. Cada parte do sistema entra com o papel de menor privilégio que precisa."""
import os, unicodedata
from pathlib import Path
import psycopg

RAIZ = Path(__file__).resolve().parent.parent


def _env():
    vals = {}
    for linha in (RAIZ / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.startswith("#"):
            k, v = linha.split("=", 1)
            vals[k.strip()] = v.strip()
    return {**vals, **{k: v for k, v in os.environ.items() if k.startswith(("PG_", "APP_", "LLM_", "PERSONA", "GEMINI_", "STT_"))}}


SENHA = {"app_super": "PG_SUPERUSER_PASSWORD", "motor": "APP_MOTOR_PASSWORD", "admin_catalogo": "APP_ADMIN_PASSWORD", "avaliador": "APP_AVALIADOR_PASSWORD", "atendente": "APP_ATENDENTE_PASSWORD"}


def _aquecer(con):
    """O dicionário de radicais do português carrega na 1ª chamada de cada conexão (~4 s). Aquece ao abrir."""
    con.execute("SET statement_timeout = 0")   # só no aquecimento: banco recém-reiniciado passa dos 5 s do papel motor
    con.execute("SELECT ts_lexize('portuguese_stem', 'aquecer'), to_tsvector('portuguese', 'aquecer')")
    con.execute("RESET statement_timeout")     # volta ao limite do papel para o atendimento
    con.commit()


def conectar(papel):
    e = _env()
    con = psycopg.connect(host=e["PG_HOST"], port=e["PG_PORT"], dbname="hackathon", user=papel,
                          password=e[SENHA[papel]], connect_timeout=5, autocommit=False)
    _aquecer(con)
    return con


_POOLS = {}


def pool(papel):
    """Pool de conexões já aquecidas para o atendimento (a API não paga abertura + aquecimento a cada mensagem)."""
    if papel not in _POOLS:
        from psycopg_pool import ConnectionPool
        e = _env()
        _POOLS[papel] = ConnectionPool(
            f"host={e['PG_HOST']} port={e['PG_PORT']} dbname=hackathon user={papel} password={e[SENHA[papel]]} connect_timeout=5",
            min_size=1 if papel != "motor" else 2, max_size=3 if papel != "motor" else 10,   # admin_catalogo e avaliador têm CONNECTION LIMIT 5
            configure=_aquecer, open=True)
        import atexit
        atexit.register(_POOLS[papel].close)
    return _POOLS[papel]


def normalizar(texto):
    """'São Leopoldo' -> 'sao leopoldo': a busca por município não depende de acento nem caixa."""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return " ".join(sem_acento.lower().split())
