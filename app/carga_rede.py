"""Carrega carga/rede/oferta.json em rede.associacao e rede.oferta (papel admin_catalogo). Idempotente."""
import json
from db import RAIZ, conectar
from protocolo import tema


def carregar():
    dados = json.loads((RAIZ / "carga" / "rede" / "oferta.json").read_text(encoding="utf-8"))
    with conectar("admin_catalogo") as con, con.cursor() as cur:
        cur.execute("DELETE FROM rede.associacao")
        for a in dados:
            cur.execute("INSERT INTO rede.associacao (slug, cidade, ra, site, situacao) VALUES (%s, %s, %s, %s, %s)",
                        (a["slug"], a["cidade"], a["ra"], a["site"], a["situacao"]))
            for s in a["servicos"]:
                cur.execute("INSERT INTO rede.oferta (slug, solucao, tema, preco, fonte) VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                            (a["slug"], s["solucao"], tema(s["solucao"]), s["preco"], s["fonte"]))
        con.commit()
    print(len(dados), "associações da rede carregadas")


if __name__ == "__main__":
    carregar()
