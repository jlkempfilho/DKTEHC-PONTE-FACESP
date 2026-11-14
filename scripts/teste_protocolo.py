"""Teste do protocolo: abre por uma demanda, vincula CPF, consulta pelo número na mesma conversa e em outra (só com o CPF),
e outra pessoa não vê o protocolo. Uso: python scripts/teste_protocolo.py"""
import json, re, urllib.request as u

BASE = "http://127.0.0.1:8090"


def conversa():
    s = {"sessao": None}

    def diz(m):
        r = json.load(u.urlopen(u.Request(BASE + "/api/atender", json.dumps({"mensagem": m, **({"sessao": s["sessao"]} if s["sessao"] else {})}).encode(),
                                          {"Content-Type": "application/json"}), timeout=300))
        s["sessao"] = r["sessao"]
        print(f"  > {m}\n  [{r['tipo']}] {r['resposta'][:260]}")
        return r
    return diz


print("Lojista A registra uma necessidade")
a = conversa()
a("Tenho um açougue e controlo o estoque no caderno, não uso computador. Nenhuma solução serve pra mim.")
r = a("Queria saber na hora quanto tem de cada carne sem ir na câmara fria.")
prot = re.search(r"ACM-\d{4}-\d{6}", r["resposta"]).group(0)
r = a("123.456.789-09")
assert "final 8909" in r["resposta"] or "vinculad" in r["resposta"], r
r = a(f"qual o status do protocolo {prot}?")
assert prot in r["resposta"], r

print("\nO mesmo lojista, em outra conversa, só com o CPF")
b = conversa()
b("123.456.789-09")
r = b("como está meu pedido de estoque?")
assert prot in r["resposta"], r

print("\nOutra pessoa tenta consultar o protocolo")
c = conversa()
c("987.654.321-00")
r = c(f"qual o status do protocolo {prot}?")
assert prot not in r["resposta"] and "Não encontrei" in r["resposta"], r
print("\nOK: protocolo aberto, vinculado, consultado pelo número e pelo serviço, e protegido de terceiros")
