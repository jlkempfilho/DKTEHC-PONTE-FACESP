"""Atendimento humano: fila de handoff para a curadoria da associação, com login individual e expiração do relato (LGPD).

Rotas: GET /atendimento (tela), GET /atendimento/api/fila, POST /atendimento/api/fila/{conversa}
Login: cada atendente tem um token próprio (Authorization: Bearer). Só o sha256 fica no banco; quem assume fica registrado.
Contas (operador, com o superusuário):  python app/atendimento.py criar "Nome da Pessoa"  |  desativar "Nome"
Expiração (job diário):                  python app/atendimento.py expurgar -
ponytail: token por pessoa no protótipo. Produção: Microsoft Entra ID (OIDC) com o grupo de atendentes, como o curador.
ponytail: a expiração roda a cada abertura da fila; produção: job diário (pg_cron ou agendador da infra).
"""
import hashlib, secrets, sys
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from db import pool, conectar
import limite
import demo

router = APIRouter(prefix="/atendimento/api")
RETENCAO_CONCLUIDO = "30 days"   # relato de atendimento concluído sai antes dos 90 dias do padrão


def _hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def atendente(request: Request, authorization: str = Header(default="")):
    if demo.aberto():
        return "Curadoria (demonstração)"
    limite.checar("atendente", request)
    token = authorization.removeprefix("Bearer ").strip()
    r = None
    if len(token) >= 20:
        with pool("atendente").connection() as con:
            r = con.execute("SELECT nome FROM atendimento.atendente WHERE token_hash = %s AND ativo", (_hash(token),)).fetchone()
    if not r:
        limite.falhou("atendente", request)
        raise HTTPException(401, "Acesso restrito à equipe de atendimento.")
    return r[0]


@router.get("/fila")
def fila(status: str = "aguardando", nome: str = Depends(atendente)):
    if status not in ("aguardando", "assumido", "concluido"):
        raise HTTPException(422, "Situação inválida.")
    with pool("atendente").connection() as con:
        con.execute("SELECT atendimento.expurgar_handoff(), atendimento.expurgar_contato()")   # LGPD: relato e contato vencidos saem
        cols = ("conversa_id", "criado_em", "motivo", "urgente", "servico_id", "municipio", "resumo", "status", "atendente", "expira_em")
        linhas = con.execute(f"SELECT {', '.join(cols)} FROM atendimento.handoff WHERE status = %s ORDER BY urgente DESC, criado_em LIMIT 100",
                             (status,)).fetchall()
        con.commit()
    return {"atendente": nome, "itens": [{**dict(zip(cols, l)), "conversa_id": str(l[0]), "criado_em": str(l[1]), "expira_em": str(l[9])} for l in linhas]}


class Andamento(BaseModel):
    status: str = Field(pattern=r"^(assumido|concluido)$")


@router.post("/fila/{cid}")
def andar(cid: str, a: Andamento, nome: str = Depends(atendente)):
    with pool("atendente").connection() as con:
        try:
            n = con.execute(f"""UPDATE atendimento.handoff SET status = %s, atendente = %s, atualizado_em = now(),
                                expira_em = CASE WHEN %s = 'concluido' THEN least(expira_em, now() + interval '{RETENCAO_CONCLUIDO}') ELSE expira_em END
                                WHERE conversa_id = %s::uuid""", (a.status, nome, a.status, cid)).rowcount
        except Exception:
            raise HTTPException(422, "Identificador inválido.")
        if not n:
            raise HTTPException(404, "Atendimento não encontrado.")
        con.commit()
    return {"ok": True, "atendente": nome}


def criar(nome):
    token = secrets.token_urlsafe(32)
    with conectar("app_super") as con:
        con.execute("INSERT INTO atendimento.atendente (nome, token_hash) VALUES (%s, %s)", (nome, _hash(token)))
        con.commit()
    return token


if __name__ == "__main__":
    acao, nome = sys.argv[1], sys.argv[2]
    if acao == "criar":
        print(f"Token de {nome} (aparece só agora; entregue à pessoa por canal seguro):\n{criar(nome)}")
    elif acao == "expurgar":   # para o job diário de produção: python app/atendimento.py expurgar -
        with pool("atendente").connection() as con:
            print("relatos, contatos expirados:", con.execute("SELECT atendimento.expurgar_handoff(), atendimento.expurgar_contato()").fetchone())
            con.commit()
    elif acao == "desativar":
        with conectar("app_super") as con:
            print("desativado" if con.execute("UPDATE atendimento.atendente SET ativo = false WHERE nome = %s", (nome,)).rowcount else "não encontrado")
            con.commit()
