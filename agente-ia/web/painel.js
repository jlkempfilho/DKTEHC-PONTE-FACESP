let TOKEN = "";
const $ = id => document.getElementById(id);
const el = (t, p = {}, ...f) => { const e = Object.assign(document.createElement(t), p); f.flat().forEach(x => x != null && e.append(x)); return e; };
async function api(c, o = {}) {
  const r = await fetch("/painel/api" + c, { ...o, headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || "Erro " + r.status);
  return d;
}
const kpi = (rot, val) => el("div", { className: "kpi" }, el("b", { textContent: val }), el("span", { className: "muted", textContent: rot }));
function barras(itens, rotulo, valor) {
  const max = Math.max(1, ...itens.map(valor).filter(v => typeof v === "number"));
  return el("div", { className: "barras" }, itens.map(i => {
    const v = valor(i), n = typeof v === "number" ? v : 0;
    return el("div", { className: "barra" }, el("span", { textContent: rotulo(i) }),
      el("div", { className: "trilho" }, el("div", { className: "enche", style: `width:${(n / max) * 100}%` })), el("span", { className: "n", textContent: v }));
  }));
}
const tabela = (cab, linhas) => el("table", {}, el("thead", {}, el("tr", {}, cab.map(c => el("th", { textContent: c })))),
  el("tbody", {}, linhas.map(l => el("tr", {}, l.map(c => c instanceof Node ? el("td", {}, c) : el("td", { textContent: c, className: typeof c === "number" ? "n" : "" }))))));

const ABAS = {
  async regional() {
    const d = await api("/regional");
    if (d.semente) $("aviso-semente").textContent = `Atenção: ${d.semente} das ${d.total} demandas são dados fictícios semeados para a demonstração.`;
    return [
      el("section", {}, el("h2", { textContent: "Demandas dos lojistas por região administrativa" }),
        el("p", { className: "muted", textContent: "Necessidades registradas no atendimento que nenhuma solução do catálogo atendia (percurso 2)." }),
        el("div", { className: "kpis" }, kpi("demandas registradas", d.total), kpi("regiões com demanda", d.por_ra.length)),
        barras(d.por_ra, x => x.ra, x => x.demandas)),
      el("section", {}, el("h2", { textContent: "Temas mais pedidos em cada região" }),
        tabela(["Região", "Temas (quantidade)"], d.por_ra.map(r => [r.ra, r.temas.map(([t, n]) => `${t} (${n})`).join(", ")]))),
      el("section", {}, el("h2", { textContent: "Municípios" }), tabela(["Região", "Município", "Demandas"], d.por_municipio.map(m => [m.ra, m.municipio, m.demandas]))),
    ];
  },
  async lacunas() {
    const d = await api("/lacunas");
    return [el("section", {}, el("h2", { textContent: "Onde a demanda não encontra oferta" }),
      el("p", { className: "muted", textContent: "Cruza o que os lojistas pediram com os serviços publicados nos sites das associações da mesma região (coleta de 14/11/2026, 344 associações). Lacuna = nenhuma associação da região oferece algo do tema." }),
      el("div", { className: "kpis" }, kpi("combinações região x tema com lacuna", d.lacunas)),
      tabela(["Região", "Tema", "Demandas", "Associações da região com oferta", ""], d.linhas.map(l =>
        [l.ra, l.tema, l.demandas, `${l.associacoes_com_oferta} de ${l.associacoes_na_ra}`, l.lacuna ? el("span", { className: "selo lac", textContent: "lacuna" }) : ""])))];
  },
  async status() {
    const d = await api("/status");
    return [
      el("section", {}, el("h2", { textContent: "Solicitações por status" }),
        el("div", { className: "kpis" }, kpi("abertas paradas há mais de 48h", d.parados_ha_mais_de_48h)),
        tabela(["Tipo", "Status", "Quantidade"], d.por_tipo.map(x => [x.tipo, x.status, x.quantidade]))),
      el("section", {}, el("h2", { textContent: "Quanto tempo cada solicitação fica em cada status" }),
        el("p", { className: "muted", textContent: "Mediana e percentil 90 em horas, a partir do histórico de status. É a base para a FACESP e as associações definirem o SLA de cada etapa." }),
        tabela(["Tipo", "Status", "Passagens medidas", "Mediana (h)", "90% em até (h)"], d.tempo_por_status.map(x => [x.tipo, x.status, x.casos, x.mediana_h, x.p90_h]))),
    ];
  },
  async fila() {
    const d = await api("/fila");
    const ordem = [["aguardando_associacao", "Aguardando a associação"], ["aberta", "Abertas"], ["em_andamento", "Em andamento"], ["aguardando_associado", "Aguardando o associado"]];
    const opcoes = [["em_andamento", "em andamento"], ["aguardando_associado", "aguardando o associado"], ["aguardando_associacao", "em análise pela associação"], ["concluida", "concluída"], ["cancelada", "cancelada"]];
    return [el("section", {}, el("h2", { textContent: "Fila da associação por status" }),
      el("p", { className: "muted", textContent: "Mais antigas primeiro. Mudar o status registra quem mudou e o motivo, e o associado vê o novo status ao consultar o protocolo." }),
      el("div", { className: "colunas" }, ordem.map(([s, nome]) => {
        const itens = d.filter(x => x.status === s);
        return el("div", { className: "coluna" }, el("h3", { textContent: `${nome} (${itens.length})` }), itens.slice(0, 15).map(x => {
          const sel = el("select", {}, opcoes.map(([v, n]) => el("option", { value: v, textContent: n })));
          const mot = el("input", { placeholder: "motivo" }); const msg = el("span", { className: "muted" });
          return el("div", { className: "cartao" }, el("strong", { textContent: x.protocolo }), el("div", { textContent: `${x.tipo}: ${x.titulo}` }),
            el("div", { className: "muted", textContent: `${x.municipio || "sem município"} · ${x.titular} · há ${x.idade_h} h` }), sel, mot,
            el("button", { type: "button", textContent: "Mudar status", onclick: async () => {
              try { await api("/fila/" + x.protocolo, { method: "POST", body: JSON.stringify({ status: sel.value, motivo: mot.value.trim() || "atualizado pela associação" }) }); abrir("fila"); }
              catch (e) { msg.className = "erro"; msg.textContent = e.message; } } }), msg);
        }));
      })))];
  },
  async naosoube() {
    const d = await api("/nao-soube");
    return [el("section", {}, el("h2", { textContent: "O que o atendimento não soube resolver (30 dias)" }),
      el("p", { className: "muted", textContent: "Perguntas que terminaram sem resposta ou passaram para uma pessoa. É a lista de POPs e soluções que faltam cadastrar." }),
      el("div", { className: "kpis" }, kpi("conversas", d.total), d.semente ? kpi("delas fictícias (demonstração)", d.semente) : null), barras(d.por_tema, x => x[0], x => x[1]),
      el("h2", { textContent: "Exemplos recentes", style: "margin-top:16px" }), tabela(["Desfecho", "Mensagem do lojista"], d.exemplos.map(x => [x.desfecho, x.mensagem])))];
  },
};
async function abrir(aba) {
  document.querySelectorAll("nav button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.aba === aba)));
  try { $("conteudo").replaceChildren(...await ABAS[aba]()); } catch (e) { $("conteudo").replaceChildren(el("section", { className: "erro", textContent: e.message })); }
}
document.querySelectorAll("nav button").forEach(b => b.onclick = () => abrir(b.dataset.aba));
$("entrar").onclick = async () => {
  TOKEN = $("token").value.trim();
  try { await api("/regional"); $("login").hidden = true; $("app").hidden = false; abrir("regional"); }
  catch (e) { $("msg").className = "erro"; $("msg").textContent = e.message; }
};
fetch("/api/demo").then(r => r.json()).then(d => { if (d.aberto) $("entrar").click(); }).catch(() => {});
