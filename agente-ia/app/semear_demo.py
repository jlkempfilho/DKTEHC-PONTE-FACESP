"""Dados FICTÍCIOS para os painéis da demonstração: solicitações com histórico de status nos últimos 30 dias e
perguntas que o atendimento não soube responder. Tudo marcado (solicitação origem='semente'; conversa canal='api').
Rodar de novo apaga a semente anterior e recria. Uso: python semear_demo.py"""
import random
from datetime import datetime, timedelta, timezone
from db import conectar
from protocolo import tema

random.seed(14112026)
PROBLEMAS = [
    "Demoro para confirmar se tenho o produto no estoque quando o cliente pergunta no WhatsApp",
    "Falta produto que vende muito e sobra mercadoria parada",
    "Perco mensagens de clientes no WhatsApp e esqueço de responder",
    "Não sei se estou tendo lucro de verdade",
    "Quero vender pela internet e não sei por onde começar",
    "Clientes compram uma vez e não voltam mais",
    "Não consigo conferir os recebimentos de Pix, cartão e dinheiro",
    "Perco tempo cobrando cliente que compra fiado",
    "Preciso contratar vendedor e ninguém aparece para a vaga",
    "Quero treinar minha equipe de vendas e não tenho tempo",
    "Quero usar inteligência artificial e não sei quanto custa",
    "Recebo pedidos pelo Instagram, WhatsApp e balcão e não consigo juntar",
    "Não consigo prever quanto vou vender no próximo mês",
    "Preciso de entrega no mesmo dia para os pedidos do bairro",
    "Quero divulgar promoções para os clientes sem mandar uma por uma",
]
PESO = [9, 6, 8, 5, 6, 5, 4, 4, 5, 3, 3, 4, 3, 3, 4]
# concentração na Baixa Mogiana (RA 16), onde a base foi revisada à mão
CIDADES = (["Mogi-Guacu"] * 9 + ["Mogi Mirim"] * 7 + ["Itapira"] * 4 + ["Sao Joao Da Boa Vista"] * 3 + ["Socorro"] * 2 + ["Espirito Santo Do Pinhal"] * 2
           + ["Campinas"] * 5 + ["Jundiai"] * 3 + ["Sorocaba"] * 3 + ["Ribeirao Preto"] * 3 + ["Santos"] * 2 + ["Sao Jose Dos Campos"] * 2
           + ["Bauru"] * 2 + ["Piracicaba"] * 2 + ["Marilia", "Franca", "Presidente Prudente", "Araras", "Divinolandia", "Tapiratiba"])
NAO_SOUBE = [
    "Quanto custa a mensalidade para me associar?", "Qual é o WhatsApp da associação de Socorro?", "Minha cidade tem associação comercial? Sou de Itobi",
    "O site da associação de Aguaí não abre", "Quais associações da região têm plano odontológico?", "Posso demitir funcionário por justa causa por atraso?",
    "Qual a melhor maquininha de cartão?", "A associação aluga sala para treinamento?", "Vocês fazem registro na JUCESP?",
    "Tem convênio de plano de saúde para três funcionários?", "Como negativo um cliente que não pagou?", "Associado paga menos no certificado digital?",
    "Como sei se meu preço está competitivo?", "Tem alguma plataforma para comparar fornecedores?", "Como medir a produtividade da equipe?",
]
STATUS_DEMANDA = [("aberta", 0.35), ("em_andamento", 0.35), ("concluida", 0.2), ("cancelada", 0.1)]


def escolher(pares):
    r, acc = random.random(), 0
    for v, p in pares:
        acc += p
        if r <= acc:
            return v
    return pares[-1][0]


def main():
    agora = datetime.now(timezone.utc)
    with conectar("app_super") as con, con.cursor() as cur:
        cur.execute("DELETE FROM atendimento.solicitacao WHERE origem = 'semente'")
        cur.execute("DELETE FROM atendimento.mensagem WHERE conversa_id IN (SELECT id FROM atendimento.conversa WHERE canal = 'api')")
        cur.execute("DELETE FROM atendimento.conversa WHERE canal = 'api'")
        n = 0

        def nova(tipo, titulo, cidade, passos):
            nonlocal n
            n += 1
            prot = f"ACM-2026-9{n:05d}"
            t = agora - timedelta(days=random.uniform(1, 30))
            cur.execute("""INSERT INTO atendimento.solicitacao (protocolo, tipo, titulo, tema, status, municipio, origem, titular_final, criada_em, atualizada_em)
                           VALUES (%s, %s, %s, %s, %s, %s, 'semente', %s, %s, %s)""",
                        (prot, tipo, titulo, tema(titulo), passos[-1][0], cidade, f"{random.randint(0, 9999):04d}", t, t))
            de = None
            for status, horas, motivo, por in passos:
                t = min(agora, t + timedelta(hours=horas))
                cur.execute("INSERT INTO atendimento.solicitacao_hist (protocolo, de, para, motivo, por, em) VALUES (%s, %s, %s, %s, %s, %s)",
                            (prot, de, status, motivo, por, t))
                de = status
            cur.execute("UPDATE atendimento.solicitacao SET atualizada_em = %s, criada_em = LEAST(criada_em, %s) WHERE protocolo = %s", (t, t, prot))

        for _ in range(140):
            prob = random.choices(PROBLEMAS, PESO)[0]
            fim = escolher(STATUS_DEMANDA)
            passos = [("aberta", 0, "registrada pelo atendimento", "atendimento")]
            if fim != "aberta":
                passos.append(("em_andamento", random.uniform(12, 120), "startup avaliando a demanda", "startup"))
            if fim in ("concluida", "cancelada"):
                passos.append((fim, random.uniform(48, 240), "piloto concluído" if fim == "concluida" else "lojista desistiu", "associação"))
            nova("demanda", prob, random.choice(CIDADES), passos)
        for _ in range(35):   # admissões (trilha): tempo de análise de documentos varia muito -> é o que o SLA mede
            passos = [("em_andamento", 0, "trilha iniciada", "atendimento"),
                      ("aguardando_associacao", random.uniform(0.2, 6), "documentos enviados para análise", "atendimento")]
            r = random.random()
            if r < 0.75:
                passos.append(("em_andamento", random.choice([random.uniform(2, 30), random.uniform(30, 96)]), "documentos aceitos", "curadoria"))
                if r < 0.6:
                    passos.append(("concluida", random.uniform(1, 48), "trilha concluída", "atendimento"))
            elif r < 0.85:
                passos.append(("aguardando_associado", random.uniform(4, 48), "documento devolvido: ilegível", "curadoria"))
            nova("trilha", "Admissão de novo associado", random.choice(CIDADES[:27]), passos)
        for _ in range(25):
            passos = [("aguardando_associacao", 0, "passado para a equipe", "atendimento")]
            if random.random() < 0.7:
                passos.append(("em_andamento", random.uniform(0.3, 30), "atendente assumiu", "associação"))
                if random.random() < 0.7:
                    passos.append(("concluida", random.uniform(0.5, 24), "resolvido", "associação"))
            nova("chamado", "Atendimento com a equipe (pedido do associado)", random.choice(CIDADES), passos)
        for _ in range(60):
            t = agora - timedelta(days=random.uniform(0, 30))
            cid = cur.execute("INSERT INTO atendimento.conversa (criado_em, canal, desfecho) VALUES (%s, 'api', %s) RETURNING id",
                              (t, random.choice(["abstencao"] * 3 + ["humano"]))).fetchone()[0]
            cur.execute("INSERT INTO atendimento.mensagem (conversa_id, criado_em, papel, conteudo) VALUES (%s, %s, 'cidadao', %s)",
                        (cid, t, random.choice(NAO_SOUBE)))
        con.commit()
    print(f"{n} solicitações fictícias e 60 conversas sem resposta semeadas")


if __name__ == "__main__":
    main()
