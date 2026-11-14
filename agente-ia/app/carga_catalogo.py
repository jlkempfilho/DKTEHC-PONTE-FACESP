"""Carrega carga/catalogo.json no catálogo (papel admin_catalogo). Idempotente: rodar de novo só atualiza o que mudou."""
import json
from psycopg.types.json import Jsonb
from db import RAIZ, conectar, normalizar

OBRIGATORIOS = ("id", "nome", "descricao", "atribuicao", "encaminhamento", "fonte_url", "fonte_data", "vigencia")
CAMPOS = ("nome", "descricao", "assuntos", "atribuicao", "limites", "canais", "documentos", "urgencia",
          "critico", "encaminhamento", "horarios", "fonte_url", "fonte_data", "vigencia")


def linha(s):
    faltando = [c for c in OBRIGATORIOS if not s.get(c)]
    if faltando:
        raise ValueError(f"{s.get('id', '?')}: faltando {faltando}")
    return {
        **{c: s.get(c) for c in CAMPOS},
        "id": s["id"],
        "canais": Jsonb(s.get("canais", [])),
        "documentos": Jsonb(s.get("documentos", [])),
        "assuntos": s.get("assuntos", []),
        "critico": bool(s.get("urgencia")) and s["urgencia"].upper().startswith("CRÍTICO"),
        "vigencia": f"[{s['vigencia']},)",
    }


def carregar(servicos):
    with conectar("admin_catalogo") as con, con.cursor() as cur:
        for s in servicos:
            r = linha(s)
            sets = ", ".join(f"{c} = EXCLUDED.{c}" for c in CAMPOS)
            # só grava (e só versiona) se algo mudou de fato
            muda = " OR ".join(f"servico.{c} IS DISTINCT FROM EXCLUDED.{c}" for c in CAMPOS)
            cur.execute(
                f"INSERT INTO catalogo.servico (id, {', '.join(CAMPOS)}) VALUES (%(id)s, {', '.join('%(' + c + ')s' for c in CAMPOS)}) "
                f"ON CONFLICT (id) DO UPDATE SET {sets} WHERE {muda}", r)
            cur.execute("DELETE FROM catalogo.territorio WHERE servico_id = %s", (s["id"],))
            for t in s.get("territorio", []):
                contato = {k: v for k, v in t.items() if k not in ("municipio", "unidade")}
                cur.execute("INSERT INTO catalogo.territorio VALUES (%s, %s, %s, %s)",
                            (s["id"], normalizar(t["municipio"]), t["unidade"], Jsonb(contato)))
        con.commit()
        cur.execute("SELECT count(*) FROM catalogo.servico WHERE ativo")
        return cur.fetchone()[0]


if __name__ == "__main__":
    dados = json.loads((RAIZ / "carga" / "catalogo.json").read_text(encoding="utf-8"))
    print(carregar(dados), "serviços ativos no catálogo")
