"""Curadoria de vocabulário (papel admin_catalogo = curador da associação).

python app/curadoria_termos.py relatorio
    -> gera curadoria/termos-AAAA-MM-DD.md com os termos aguardando decisão e as evidências
python app/curadoria_termos.py decidir <termo> <integral|parcial|rejeitar> "<significado>" "<observação>"
    -> registra a decisão com autor e data (fica no histórico do termo)
"""
import sys
from datetime import date
from db import RAIZ, conectar, normalizar

STATUS = {"integral": "confirmado_integral", "parcial": "confirmado_parcial", "rejeitar": "rejeitado"}


def relatorio():
    with conectar("admin_catalogo") as con, con.cursor() as cur:
        termos = cur.execute("""SELECT termo, significado, status, confirmacoes, negacoes, primeiro_visto::date, ultimo_visto::date
                                FROM conhecimento.termo WHERE status IN ('aprendendo','confirmado_parcial')
                                ORDER BY confirmacoes + negacoes DESC, termo""").fetchall()
        linhas = [f"# Curadoria de vocabulário - {date.today():%d/%m/%Y}", "",
                  "Termos que cidadãos usaram e o assistente não reconhecia. Para cada um, decida:",
                  "- **Integral**: o termo SEMPRE tem esse sentido. O assistente passa a entender sem perguntar.",
                  "- **Parcial**: o sentido é comum, mas pode haver outro. O assistente continua perguntando, já sugerindo este sentido.",
                  "- **Rejeitar**: o sentido sugerido está errado ou não deve ser usado.", "",
                  "Comando: `python app/curadoria_termos.py decidir <termo> <integral|parcial|rejeitar> \"<significado>\" \"<observação>\"`", ""]
        if not termos:
            linhas.append("Nenhum termo aguardando decisão.")
        for termo, sig, status, conf, neg, prim, ult in termos:
            total = conf + neg
            linhas += [f"## {termo}", "",
                       f"- Sentido sugerido: **{sig or '(ainda sem sugestão)'}**",
                       f"- Situação atual: {status} · confirmações {conf} · negações {neg}"
                       + (f" · concordância {conf / total:.0%}" if total else ""),
                       f"- Visto de {prim:%d/%m/%Y} a {ult:%d/%m/%Y}", "", "| Data | O assistente perguntou | O cidadão respondeu | Confirmou? |", "|---|---|---|---|"]
            for em, perg, resp, conf_ in cur.execute(
                    "SELECT em::date, pergunta, resposta, confirmou FROM conhecimento.termo_evidencia WHERE termo = %s ORDER BY em DESC LIMIT 10", (termo,)):
                ok = "sim" if conf_ else ("não" if conf_ is False else "resposta aberta")
                linhas.append(f"| {em:%d/%m} | {perg} | {resp} | {ok} |")
            linhas.append("")
    destino = RAIZ / "curadoria" / f"termos-{date.today().isoformat()}.md"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text("\n".join(linhas), encoding="utf-8")
    return destino, len(termos)


def decidir(termo, decisao, significado, observacao):
    termo = normalizar(termo)
    with conectar("admin_catalogo") as con:
        n = con.execute("""UPDATE conhecimento.termo SET status = %s, significado = %s, observacao_curador = %s,
                           curado_por = session_user, curado_em = now() WHERE termo = %s""",
                        (STATUS[decisao], significado, observacao, termo)).rowcount
        con.commit()
    return n


if __name__ == "__main__":
    if sys.argv[1:2] == ["relatorio"]:
        print("gerado:", *relatorio())
    elif sys.argv[1:2] == ["decidir"] and len(sys.argv) >= 5:
        print("termos atualizados:", decidir(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else None))
    else:
        print(__doc__)
