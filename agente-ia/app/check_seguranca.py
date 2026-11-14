"""Prova de isolamento e auditoria. Roda depois da carga. Falhou = não sobe para produção.

python app/check_seguranca.py
"""
import psycopg
from db import conectar


def nega(papel, sql, motivo):
    con = conectar(papel)
    try:
        con.execute(sql)
        raise AssertionError(f"FALHA: {papel} conseguiu {motivo}")
    except psycopg.errors.InsufficientPrivilege:
        print(f"ok  {papel} não consegue {motivo}")
    finally:
        con.rollback(); con.close()


def check():
    # 1. o motor lê o catálogo
    with conectar("motor") as con:
        n = con.execute("SELECT count(*) FROM catalogo.servico").fetchone()[0]
        assert n > 0, "motor não lê o catálogo"
        print(f"ok  motor lê o catálogo ({n} serviços)")
    # 2. menor privilégio: o que cada papel NÃO pode
    nega("motor", "SELECT * FROM avaliacao.caso", "ler o gabarito")
    nega("motor", "UPDATE catalogo.servico SET nome = nome", "alterar o catálogo")
    nega("motor", "SELECT * FROM atendimento.contato", "ler dados pessoais de volta")
    nega("motor", "SELECT * FROM auditoria.servico_hist", "ler a auditoria")
    nega("motor", "CREATE TABLE public.x (i int)", "criar tabela em public")
    nega("admin_catalogo", "DELETE FROM auditoria.servico_hist", "apagar a auditoria")
    nega("admin_catalogo", "SELECT * FROM avaliacao.caso", "ler o gabarito")
    nega("avaliador", "UPDATE catalogo.servico SET nome = nome", "alterar o catálogo")
    nega("admin_catalogo", "SELECT * FROM atendimento.contato", "ler dados pessoais (painel só vê agregados)")
    nega("motor", "UPDATE conhecimento.termo SET status = 'confirmado_integral'", "confirmar termo de vocabulário")
    # 3. auditoria: editar versiona e grava histórico (desfeito no fim)
    con = conectar("admin_catalogo")
    try:
        v0 = con.execute("SELECT versao FROM catalogo.servico WHERE id = 'denuncia'").fetchone()[0]
        h0 = con.execute("SELECT count(*) FROM auditoria.servico_hist").fetchone()[0]
        con.execute("UPDATE catalogo.servico SET horarios = horarios || ' ' WHERE id = 'denuncia'")
        v1 = con.execute("SELECT versao FROM catalogo.servico WHERE id = 'denuncia'").fetchone()[0]
        h1 = con.execute("SELECT count(*) FROM auditoria.servico_hist").fetchone()[0]
        assert v1 == v0 + 1 and h1 == h0 + 1, "edição não versionou"
        print("ok  edição sobe a versão e grava histórico")
        try:
            con.execute("INSERT INTO catalogo.servico (id, nome, descricao, atribuicao, encaminhamento, fonte_url, fonte_data, vigencia) "
                        "VALUES ('sem-fonte', 'x', 'x', 'x', 'x', 'http://inseguro', now(), '[2026-01-01,)')")
            raise AssertionError("FALHA: aceitou fonte sem https")
        except psycopg.errors.CheckViolation:
            print("ok  catálogo recusa fonte sem https")
    finally:
        con.rollback(); con.close()
    print("CHECK DE SEGURANÇA OK")


if __name__ == "__main__":
    check()
