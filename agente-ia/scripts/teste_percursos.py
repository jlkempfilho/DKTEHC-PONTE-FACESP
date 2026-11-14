"""Teste de ponta a ponta dos dois percursos do desafio FACESP contra a aplicação no ar (http://127.0.0.1:8090).
Uso: python scripts/teste_percursos.py   (lê STARTUP_TOKEN do .env)"""
import json, sys, urllib.request as u
from pathlib import Path

BASE = "http://127.0.0.1:8090"
TOKEN = next(l.split("=", 1)[1].strip() for l in (Path(__file__).parents[1] / ".env").read_text(encoding="utf-8").splitlines() if l.startswith("STARTUP_TOKEN="))


def post(caminho, corpo, token=None):
    h = {"Content-Type": "application/json", **({"Authorization": "Bearer " + token} if token else {})}
    return json.load(u.urlopen(u.Request(BASE + caminho, json.dumps(corpo).encode(), h), timeout=180))


def conversa(msgs):
    sessao, ultima, tipos = None, None, []
    for m in msgs:
        ultima = post("/api/atender", {"mensagem": m, **({"sessao": sessao} if sessao else {})})
        sessao = ultima["sessao"]
        tipos.append(ultima["tipo"])
        print(f"  lojista: {m}\n  [{ultima['tipo']}] {ultima['resposta'][:220]}")
    ultima["tipos"] = tipos
    return ultima


print("Percurso 1 (existe solução):")
r = conversa(["Tenho uma papelaria, recebo pedido pelo WhatsApp e demoro para confirmar se o produto está no estoque. Controlo numa planilha."])
assert r["tipo"] == "servico" and r["servico"] == "estoque-whatsapp", r

print("\nPercurso 2, loja A (sem solução):")
r = conversa(["Tenho uma loja de tecidos. Quando a cliente pergunta pelo WhatsApp se tem um tecido, eu tenho que ir no fundo da loja olhar. "
              "Aconteceu ontem umas cinco vezes. Controlo o estoque num caderno, não uso computador. Nenhuma dessas opções serve pra mim.",
              "Queria responder na hora, sem sair do balcão."])
assert "demanda_registrada" in r["tipos"], r

print("\nPercurso 2, loja B (relato parecido):")
r = conversa(["Não uso sistema nenhum, anoto tudo no caderno. Tenho armarinho e perco tempo indo conferir no estoque se tem a peça que o cliente pediu no WhatsApp.",
              "Resolver seria eu saber na hora se tem, sem levantar do balcão."])
assert "demanda_registrada" in r["tipos"], r

req = u.Request(BASE + "/startup/api/demandas", headers={"Authorization": "Bearer " + TOKEN})
ds = json.load(u.urlopen(req, timeout=30))
print("\nStartup vê:", [(d["codigo"], d["lojas"], d["problema"][:60]) for d in ds])
alvo = max(ds, key=lambda d: d["lojas"])
post(f"/startup/api/demandas/{alvo['grupo']}/respostas", {"startup": "EstoqueZap (fictícia)", "tipo": "piloto",
     "texto": "Adaptamos a consulta de estoque para funcionar com foto do caderno, sem computador.",
     "responsavel": "Curadoria da associação", "proximo_passo": "Fotografar o caderno e cadastrar 20 produtos",
     "indicador": "Tempo para confirmar disponibilidade", "ponto_partida": "5 idas ao estoque por dia",
     "resultado_esperado": "Confirmar sem sair do balcão"}, TOKEN)
ds = json.load(u.urlopen(req, timeout=30))
alvo = next(d for d in ds if d["grupo"] == alvo["grupo"])
print("Depois da proposta:", alvo["codigo"], alvo["status"], [r["tipo"] for r in alvo["respostas"]])
assert alvo["status"] == "piloto"
print("\nOK: dois percursos funcionando")
