"""Camada de LLM (Subanexo I-A 11.i): o domínio chama `gerar_json`; trocar de provedor é configuração, não reescrita.

Provedores: `local` (Ollama no compose) e `gemini` (API). Escolha por LLM_PROVEDOR no .env.
Cada chamada devolve também o registro do modelo usado (11.h): provedor, modelo, parâmetros e latência.
"""
import json, time, urllib.error, urllib.request
from dataclasses import dataclass, field
from db import _env

TIMEOUT_S = 60


@dataclass
class Resposta:
    dados: dict
    provedor: str
    modelo: str
    latencia_ms: int
    params: dict = field(default_factory=dict)


class ErroLLM(RuntimeError):
    pass


def _post(url, corpo, headers):
    req = urllib.request.Request(url, data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:  # não expõe corpo (pode ecoar a chave em alguns provedores)
        raise ErroLLM(f"HTTP {e.code} em {url.split('?')[0]}") from None
    except (urllib.error.URLError, TimeoutError) as e:
        raise ErroLLM(f"sem resposta de {url.split('?')[0]}: {e}") from None


def _local(e, sistema, usuario, params):
    url = e.get("LLM_LOCAL_URL", "http://127.0.0.1:11435") + "/api/chat"
    modelo = e.get("LLM_LOCAL_MODELO", "qwen2.5:7b-instruct")
    r = _post(url, {"model": modelo, "stream": False, "format": "json", "options": {**{k: v for k, v in params.items() if k != "raciocinio"},
                                                                   # prompt de resposta (Política + persona + catálogo) passa de 4 mil tokens: sem isso o Ollama corta e o JSON sai quebrado
                                                                   "num_ctx": int(e.get("LLM_LOCAL_CONTEXTO", "8192"))},
                    "messages": [{"role": "system", "content": sistema}, {"role": "user", "content": usuario}]}, {})
    return modelo, r["message"]["content"]


def _gemini(e, sistema, usuario, params):
    # Decisão do Kemp (24/10): produção e aprendizado são 100% locais. Provedor externo só para comparação de laboratório,
    # ligado explicitamente; nunca com dado de cidadão real.
    if e.get("LLM_PERMITIR_EXTERNO", "false").lower() != "true":
        raise ErroLLM("provedor externo desativado (LLM_PERMITIR_EXTERNO=false): o projeto usa só o modelo local")
    modelo = e.get("LLM_GEMINI_MODELO", "gemini-3.5-flash")  # versão fixa, nunca -latest (reprodutibilidade)
    chave = e.get("GEMINI_API_KEY") or ""
    if not chave:
        raise ErroLLM("GEMINI_API_KEY ausente no .env")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent"
    r = _post(url, {"systemInstruction": {"parts": [{"text": sistema}]},
                    "contents": [{"role": "user", "parts": [{"text": usuario}]}],
                    "generationConfig": {"responseMimeType": "application/json", "temperature": params.get("temperature", 0),
                                         # raciocínio estendido custa ~3 s por chamada; atendimento usa orçamento 0 (medido: 4,5 s -> 1,6 s)
                                         "thinkingConfig": {"thinkingBudget": int(params.get("raciocinio", e.get("LLM_GEMINI_THINKING_BUDGET", "0")))}}},
              {"x-goog-api-key": chave})  # chave no cabeçalho, nunca na URL (não vaza em log de proxy)
    return modelo, r["candidates"][0]["content"]["parts"][0]["text"]


PROVEDORES = {"local": _local, "gemini": _gemini}  # gemini: só laboratório, ver _gemini


def gerar_json(sistema, usuario, provedor=None, temperature=0.0, raciocinio=None):
    e = _env()
    provedor = provedor or e.get("LLM_PROVEDOR", "local")
    params = {"temperature": temperature, **({"raciocinio": raciocinio} if raciocinio is not None else {})}
    t0 = time.perf_counter()
    modelo, texto = PROVEDORES[provedor](e, sistema, usuario, params)
    ms = int((time.perf_counter() - t0) * 1000)
    try:
        dados = json.loads(texto)
    except json.JSONDecodeError:
        raise ErroLLM(f"{provedor}/{modelo} devolveu JSON inválido") from None
    if not isinstance(dados, dict):
        raise ErroLLM(f"{provedor}/{modelo} devolveu {type(dados).__name__}, esperado objeto")
    return Resposta(dados, provedor, modelo, ms, params)


if __name__ == "__main__":
    import sys
    r = gerar_json("Responda só JSON no formato {\"ok\": true, \"soma\": <número>}.", "Quanto é 2 + 3?",
                   provedor=sys.argv[1] if len(sys.argv) > 1 else None)
    assert r.dados.get("soma") == 5, r.dados
    print(f"check ok  {r.provedor}/{r.modelo}  {r.latencia_ms} ms")
