"""Protocolo e status de tudo que o atendimento gera (demanda, trilha, documento, chamado, piloto).
O associado consulta pelo número ou pelo serviço; só vê o que é dele (mesma conversa, mesmo telefone ou mesmo CPF/CNPJ).
Telefone e documento ficam como HMAC com chave secreta (PROTOCOLO_CHAVE); só os 4 últimos dígitos são legíveis."""
import hashlib, hmac, re
from datetime import date
from db import _env

STATUS = {"aberta": "aberta", "em_andamento": "em andamento", "aguardando_associado": "aguardando você",
          "aguardando_associacao": "em análise pela associação", "concluida": "concluída", "cancelada": "cancelada"}
TIPO = {"demanda": "Necessidade registrada", "trilha": "Processo", "documento": "Documento", "chamado": "Atendimento com a equipe", "piloto": "Projeto-piloto"}

# temas comuns a demandas e à oferta das associações (painéis de lacunas)
TEMAS = [
    ("estoque", r"estoque|invent[aá]rio|falta produto|sobra merc|tem o produto|tem no estoque|caderno"),
    ("atendimento WhatsApp", r"whats|zap|mensag|responder cliente|atendimento autom"),
    ("vendas online", r"internet|online|marketplace|mercado livre|shopee|site|loja virtual|e-?commerce"),
    ("marketing e clientes", r"clientes?|divulg|promo|campanha|instagram|vender mais|fideliz|movimento"),
    ("financeiro e gestão", r"lucro|receita|despesa|financ|fluxo de caixa|gest[aã]o|nota fiscal|emissor|sistema de gest|mei\b"),
    ("pagamentos e cobrança", r"pix|cart[aã]o|maquininha|receb|fiado|cobran|inadimpl|negativ|scpc|boa vista|equifax|serasa|spc|protesto|recupera"),
    ("contratação", r"contrat|vaga|funcion[aá]ri|empreg|est[aá]gio|aprendiz|rh\b"),
    ("capacitação", r"trein|capacit|curso|palestra|faculdade"),
    ("crédito", r"cr[eé]dito|empr[eé]stimo|cooperativa|sicoob|sicredi|accredito"),
    ("jurídico", r"jur[ií]dic|advog|mediac|arbitrag|marcas|patente|lgpd"),
    ("inteligência artificial", r"intelig[eê]ncia artificial|\bia\b|chatbot|automa"),
    ("entrega e logística", r"entreg|frete|motoboy|log[ií]stic|fornecedor"),
    ("saúde e benefícios", r"sa[uú]de|odonto|unimed|seguro|benef[ií]cio|conv[eê]nio|telemedic|eba"),
]


def tema(texto):
    t = (texto or "").lower()
    return next((n for n, p in TEMAS if re.search(p, t)), "outros")


def _chave():
    return (_env().get("PROTOCOLO_CHAVE") or _env().get("ADMIN_TOKEN") or "").encode()


def titular(valor):
    """(hash, 4 últimos) de telefone, CPF ou CNPJ; só dígitos contam."""
    d = re.sub(r"\D", "", valor or "")
    return (hmac.new(_chave(), d.encode(), hashlib.sha256).hexdigest(), d[-4:]) if len(d) >= 8 else (None, None)


DOCUMENTO = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")
NUMERO = re.compile(r"\b([A-Z]{2,4})-?(\d{4})-?(\d{4,6})\b", re.I)
CONSULTA = re.compile(r"protocolo|status|andamento|como (est[aá]|anda|ficou)|j[aá] (foi|saiu|analisaram|aprovaram)|minhas? (solicita|demanda|pedido|cadastro)|meus pedidos", re.I)


def abrir(cur, tipo, titulo, contexto, referencia=None, status="aberta", tema_texto=None, municipio=None, ra=None):
    n = cur.execute("SELECT nextval('atendimento.protocolo_seq')").fetchone()[0]
    prot = f"ACM-{date.today().year}-{n:06d}"
    th, tf = contexto.get("titular_hash"), contexto.get("titular_final")
    cur.execute("""INSERT INTO atendimento.solicitacao (protocolo, tipo, titulo, referencia, tema, status, sessao, titular_hash, titular_final, municipio, ra)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (prot, tipo, titulo[:200], referencia, tema(tema_texto or titulo), status, contexto.get("sessao"), th, tf,
                 municipio or contexto.get("municipio"), ra))
    cur.execute("INSERT INTO atendimento.solicitacao_hist (protocolo, de, para, motivo, por) VALUES (%s, NULL, %s, 'aberto pelo atendimento', 'atendimento')", (prot, status))
    contexto.setdefault("protocolos", []).append(prot)
    return prot


def mudar(cur, prot, status, motivo=None, por="atendimento"):
    r = cur.execute("SELECT status FROM atendimento.solicitacao WHERE protocolo = %s", (prot,)).fetchone()
    if not r or r[0] == status:
        return False
    cur.execute("UPDATE atendimento.solicitacao SET status = %s, atualizada_em = now() WHERE protocolo = %s", (status, prot))
    cur.execute("INSERT INTO atendimento.solicitacao_hist (protocolo, de, para, motivo, por) VALUES (%s, %s, %s, %s, %s)", (prot, r[0], status, motivo, por))
    return True


def vincular(cur, contexto, texto):
    """CPF/CNPJ dito na conversa passa a identificar o associado (e os protocolos desta conversa)."""
    m = DOCUMENTO.search(texto or "")
    if not m:
        return False
    th, tf = titular(m.group(0))
    contexto["titular_hash"], contexto["titular_final"] = th, tf
    if contexto.get("sessao"):
        cur.execute("UPDATE atendimento.solicitacao SET titular_hash = %s, titular_final = %s WHERE sessao = %s AND titular_hash IS NULL",
                    (th, tf, contexto["sessao"]))
    return True


def _meus(cur, contexto):
    th, sessao = contexto.get("titular_hash"), contexto.get("sessao")
    return cur.execute("""SELECT protocolo, tipo, titulo, status, atualizada_em FROM atendimento.solicitacao
                          WHERE (titular_hash IS NOT NULL AND titular_hash = %s) OR (sessao IS NOT NULL AND sessao = %s)
                          ORDER BY atualizada_em DESC LIMIT 10""", (th, sessao)).fetchall()


def _linha(r):
    from zoneinfo import ZoneInfo
    quando = r[4].astimezone(ZoneInfo("America/Sao_Paulo"))
    return f"{r[0]} · {TIPO.get(r[1], r[1])}: {r[2]} · {STATUS.get(r[3], r[3])} (atualizado em {quando:%d/%m às %H:%M})"


def consultar(cur, contexto, texto):
    """Resposta para "qual o status do protocolo X" / "como está meu cadastro". None se a mensagem não é consulta."""
    m = NUMERO.search(texto or "")
    if not (m or CONSULTA.search(texto or "")):
        return None
    meus = _meus(cur, contexto)
    if m:
        prot = f"{m.group(1).upper()}-{m.group(2)}-{int(m.group(3)):06d}"
        achou = [r for r in meus if r[0] == prot]
        if achou:
            return "Encontrei: " + _linha(achou[0]) + "."
        # não confirma se o protocolo existe para outra pessoa
        return ("Não encontrei esse protocolo no seu cadastro. Se ele foi aberto em outro aparelho, me diga o CPF ou CNPJ usado no pedido "
                "que eu procuro por ele.")
    if not meus:
        if not contexto.get("titular_hash"):
            return "Ainda não encontrei pedidos seus. Me diga o CPF ou CNPJ usado no pedido que eu procuro."
        return "Não encontrei pedidos no seu cadastro."
    # "e aquela demanda de estoque?": filtra pelo tema citado, se houver
    t = tema(texto)
    filtrados = [r for r in meus if t != "outros" and tema(r[2]) == t] or meus
    return "Seus pedidos: " + "; ".join(_linha(r) for r in filtrados[:5]) + "."
