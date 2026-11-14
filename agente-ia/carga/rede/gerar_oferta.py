"""Gera carga/rede/oferta.json a partir da base raspada dos sites das associações (associacoes.jsonl, coleta de 14/11/2026).
Fica só o que os painéis usam: cidade, regional, site, situação da coleta e serviços (nome, indício de preço, página de origem).
Sem nomes de pessoas. Uso: python carga/rede/gerar_oferta.py <caminho do associacoes.jsonl>"""
import json, sys
from pathlib import Path

entrada = Path(sys.argv[1] if len(sys.argv) > 1 else r"D:\hackathon-facesp\rag-associacoes\associacoes.jsonl")
saida = []
for linha in entrada.read_text(encoding="utf-8").splitlines():
    if not linha.strip():
        continue
    a = json.loads(linha)
    saida.append({"slug": a["slug"], "cidade": a["cidade"], "ra": a["regional"], "site": a.get("site") or None,
                  "situacao": "coletado" if a["situacao"] == "coletado" else ("sem site" if "sem site" in a["situacao"] else "site fora do ar"),
                  "servicos": [{"solucao": s["solucao"], "preco": s.get("preco"), "fonte": s.get("fonte")} for s in a.get("servicos") or []]})
destino = Path(__file__).with_name("oferta.json")
destino.write_text(json.dumps(saida, ensure_ascii=False, indent=0), encoding="utf-8")
print(len(saida), "associações,", sum(len(a["servicos"]) for a in saida), "serviços ->", destino)
