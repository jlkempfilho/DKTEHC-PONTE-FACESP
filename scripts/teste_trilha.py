"""Teste de ponta a ponta das trilhas (com DEMO_ABERTO=true): POP -> proposta -> aprovação -> onboarding na conversa,
documentos, desvio para outro assunto, aprovação da curadoria no meio, aviso e retomada.
Uso: python scripts/teste_trilha.py"""
import json, sys, urllib.request as u, uuid
from pathlib import Path

BASE = "http://127.0.0.1:8090"
RAIZ = Path(__file__).parents[1]


def req(metodo, caminho, corpo=None, arquivo=None, campos=None):
    h, dados = {}, None
    if arquivo:
        b = uuid.uuid4().hex
        partes = [f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode() for k, v in (campos or {}).items()]
        nome, mime, conteudo, campo = arquivo
        partes.append(f"--{b}\r\nContent-Disposition: form-data; name=\"{campo}\"; filename=\"{nome}\"\r\nContent-Type: {mime}\r\n\r\n".encode() + conteudo + b"\r\n")
        dados, h["Content-Type"] = b"".join(partes) + f"--{b}--\r\n".encode(), f"multipart/form-data; boundary={b}"
    elif corpo is not None:
        dados, h["Content-Type"] = json.dumps(corpo).encode(), "application/json"
    return json.load(u.urlopen(u.Request(BASE + caminho, dados, h, method=metodo), timeout=300))


sessao = None
def diz(m):
    global sessao
    r = req("POST", "/api/atender", {"mensagem": m, **({"sessao": sessao} if sessao else {})})
    sessao = r["sessao"]
    print(f"\n  associado: {m}\n  [{r['tipo']}] {r['resposta']}")
    return r


aprovadas = [t for t in req("GET", "/curadoria/api/trilhas") if t["status"] == "aprovada"]
if aprovadas:   # não sobrescreve a trilha que a curadoria já revisou
    print(f"1-2. Usando a trilha aprovada '{aprovadas[0]['id']}' (versão {aprovadas[0]['versao']})")
else:
    print("1. Curadoria sobe o POP")
    pop = (RAIZ / "carga/pops/pop-onboarding-associado.md").read_bytes()
    p = req("POST", "/curadoria/api/trilhas/propor", arquivo=("pop-onboarding-associado.md", "text/markdown", pop, "arquivo"))
    print(f"   proposta '{p['id']}': {len(p['etapas'])} etapas, {sum(e['confere'] for e in p['etapas'])} com trecho conferido")
    print("2. Curadoria tira a etapa sem trecho no POP, responde as lacunas e aprova")
    p["etapas"] = [e for e in p["etapas"] if e["confere"] or e["tipo"] in ("analise", "fim")]
    for l in p["lacunas"]:
        l["resposta"] = "O associado escolhe o plano na conversa; a análise leva até 2 dias úteis."
    req("PUT", f"/curadoria/api/trilhas/{p['id']}", {"nome": p["nome"], "gatilhos": p["gatilhos"] + ["quero me associar"],
                                                     "etapas": p["etapas"], "lacunas": p["lacunas"], "status": "aprovada"})

print("3. Associado começa o onboarding")
r = diz("Oi, quero me associar à associação")
assert r["tipo"] == "trilha", r
docs = 0
for _ in range(12):   # segue a trilha até a etapa de análise: responde perguntas, manda os documentos
    if "foto ou o PDF" in r["resposta"] or "Pode mandar" in r["resposta"]:
        r = req("POST", "/api/documento", arquivo=(f"doc{docs}.pdf", "application/pdf", b"%PDF-1.4 teste", "arquivo"), campos={"sessao": sessao})
        docs += 1
        print(f"\n  associado: [manda documento {docs}]\n  [{r['tipo']}] {r['resposta']}")
    elif "analisar" in r["resposta"] or "Te aviso" in r["resposta"]:
        break
    else:
        r = diz("Quero o Plano Essencial")
assert docs >= 1, "nenhum documento pedido"

print("\n4. No meio da espera, pergunta outra coisa")
r = diz("Enquanto isso, tem alguma ferramenta para eu vender mais?")
assert r["tipo"] == "trilha_desvio", r
r = diz("sim")
assert r["tipo"] != "trilha_desvio", r

print("\n5. Curadoria aceita os documentos")
for d in req("GET", "/curadoria/api/documentos"):
    req("POST", f"/curadoria/api/documentos/{d['id']}", {"status": "aceito"})

print("6. Próxima mensagem do associado: aviso interrompe e oferece retomar")
r = diz("E quanto custa essa ferramenta?")
assert "aceito" in r["resposta"], r
r = diz("sim")
assert r["tipo"] == "trilha" and "Voltando" in r["resposta"], r
print("\nOK: trilha com documento, desvio, aviso e retomada")
