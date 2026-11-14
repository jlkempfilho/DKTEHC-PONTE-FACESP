// Painel do curador: só DOM seguro (textContent), nunca innerHTML com dado.
let TOKEN = "";
const box = document.getElementById("conteudo");
const el = (tag, props = {}, ...filhos) => { const e = Object.assign(document.createElement(tag), props); filhos.forEach(f => e.append(f)); return e; };

async function api(caminho, opcoes = {}) {
  const r = await fetch("/admin/api" + caminho, { ...opcoes, headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json", ...(opcoes.headers || {}) } });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || ("erro " + r.status));
  return r.json();
}

function tabela(cabecalho, linhas) {
  const t = el("table"); const h = el("tr"); cabecalho.forEach(c => h.append(el("th", { textContent: c }))); t.append(el("thead", {}, h));
  const b = el("tbody"); linhas.forEach(l => { const tr = el("tr"); l.forEach(c => tr.append(c instanceof Node ? el("td", {}, c) : el("td", { textContent: c ?? "" }))); b.append(tr); });
  t.append(b); return t;
}

const ABAS = {
  async indicadores() {
    const d = await api("/indicadores");
    box.replaceChildren(el("h2", { textContent: "Indicadores do atendimento" }),
      el("div", { className: "kpis" }, el("div", { className: "kpi" }, el("b", { textContent: d.conversas }), "conversas"),
                                      el("div", { className: "kpi" }, el("b", { textContent: d.urgentes }), "urgências escalonadas")),
      el("h2", { textContent: "Por desfecho" }), tabela(["Desfecho", "Total"], d.por_desfecho.map(x => [x.chave, x.total])),
      el("h2", { textContent: "Por serviço" }), tabela(["Serviço", "Total"], d.por_servico.map(x => [x.chave, x.total])),
      el("h2", { textContent: "Por município" }), tabela(["Município", "Total"], d.por_municipio.map(x => [x.chave, x.total])));
  },
  async servicos() {
    const lista = await api("/servicos");
    box.replaceChildren(el("h2", { textContent: "Catálogo de serviços" }), el("p", { className: "muted", textContent: "Toda edição cria uma nova versão e guarda a anterior no histórico." }),
      tabela(["Serviço", "Versão", "Atualizado por", ""], lista.map(s => [s.nome, s.versao, s.atualizado_por, el("button", { type: "button", textContent: "Editar", onclick: () => editar(s) })])));
  },
  async termos() {
    const lista = await api("/termos");
    const linhas = lista.map(t => {
      const sig = el("input", { value: t.significado || "", "aria-label": "Significado de " + t.termo });
      const acao = d => el("button", { type: "button", textContent: d, onclick: async () => { try { await api("/termos/" + encodeURIComponent(t.termo), { method: "POST", body: JSON.stringify({ decisao: d, significado: sig.value || "-" }) }); ABAS.termos(); } catch (e) { alert(e.message); } } });
      return [t.termo, sig, t.status, `${t.confirmacoes} sim / ${t.negacoes} não`, el("span", {}, acao("integral"), " ", acao("parcial"), " ", acao("rejeitar"))];
    });
    box.replaceChildren(el("h2", { textContent: "Vocabulário aprendido com os cidadãos" }),
      el("p", { className: "muted", textContent: "Integral: o termo sempre tem esse sentido. Parcial: o assistente continua perguntando. Rejeitar: o sentido não é usado." }),
      lista.length ? tabela(["Termo", "Significado", "Situação", "Respostas", "Decisão"], linhas) : el("p", { textContent: "Nenhum termo aguardando decisão." }));
  },
  async conhecimento() {
    const lista = await api("/documentos?curadoria=pendente");
    const linhas = lista.map(d => {
      const motivo = el("input", { placeholder: "motivo (obrigatório para rejeitar)", "aria-label": "Motivo para " + d.titulo });
      const msg = el("span", { className: "muted" });
      const acao = (dec, rotulo) => el("button", { type: "button", textContent: rotulo, onclick: async () => {
        try { await api("/documentos/" + d.id, { method: "POST", body: JSON.stringify({ decisao: dec, motivo: motivo.value.trim() || null }) }); ABAS.conhecimento(); }
        catch (e) { msg.className = "erro"; msg.textContent = e.message; } } });
      const fonte = el("a", { href: d.fonte_url, textContent: d.titulo, target: "_blank", rel: "noopener noreferrer" });
      return [el("span", {}, fonte, el("br"), el("small", { className: "muted", textContent: d.amostra || "" })),
              `${d.origem === "api_externa" ? "enviado por " + d.enviado_por + " (quarentena)" : "coleta pública"} · ${d.natureza}`, d.trechos,
              el("span", {}, motivo, " ", acao("aprovado", "Aprovar"), " ", acao("rejeitado", "Rejeitar"), " ", msg)];
    });
    box.replaceChildren(el("h2", { textContent: "Conhecimento aguardando curadoria" }),
      el("p", { className: "muted", textContent: "Enviado por sistema externo fica em quarentena: o atendimento só usa depois de aprovado. Coleta pública só orienta em termos gerais; contato, prazo e documento vêm sempre do catálogo. Toda decisão fica registrada." }),
      lista.length ? tabela(["Documento", "Origem", "Trechos", "Decisão"], linhas) : el("p", { textContent: "Nada aguardando curadoria." }));
  },
  async lacunas() {
    const lista = await api("/lacunas");
    box.replaceChildren(el("h2", { textContent: "Lacunas: o que o atendimento não conseguiu resolver" }),
      el("p", { className: "muted", textContent: "Primeira mensagem das conversas sem serviço identificado. Use para decidir o que acrescentar ao catálogo." }),
      lista.length ? tabela(["Quando", "Mensagem"], lista.map(l => [l.em.slice(0, 16), l.mensagem])) : el("p", { textContent: "Nenhuma lacuna registrada." }));
  },
};

function editar(s) {
  const campos = ["nome", "descricao", "atribuicao", "limites", "encaminhamento", "horarios", "urgencia", "fonte_url", "fonte_data"];
  const form = el("form");
  const inputs = {};
  campos.forEach(c => { const i = c === "descricao" || c === "encaminhamento" ? el("textarea", { value: s[c] || "", id: "f-" + c }) : el("input", { value: s[c] || "", id: "f-" + c }); inputs[c] = i; form.append(el("label", { htmlFor: "f-" + c, textContent: c }), i); });
  const assuntos = el("input", { value: (s.assuntos || []).join(", "), id: "f-assuntos" }); form.append(el("label", { htmlFor: "f-assuntos", textContent: "assuntos (separados por vírgula)" }), assuntos);
  const canais = el("textarea", { value: JSON.stringify(s.canais, null, 1), id: "f-canais" }); form.append(el("label", { htmlFor: "f-canais", textContent: "canais (JSON)" }), canais);
  const msg = el("p", { className: "muted" });
  form.append(el("p", {}, el("button", { type: "submit", textContent: "Salvar nova versão" }), " ", el("button", { type: "button", textContent: "Ver histórico", onclick: async () => {
    const h = await api("/servicos/" + s.id + "/historico"); msg.textContent = h.length ? h.map(x => `v${x.versao} ${x.operacao} por ${x.ator} em ${x.em.slice(0, 16)}`).join(" | ") : "Sem alterações anteriores."; } }), " ",
    el("button", { type: "button", textContent: "Voltar", onclick: () => ABAS.servicos() })), msg);
  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    try {
      const corpo = Object.fromEntries(campos.map(c => [c, inputs[c].value.trim() || null]));
      corpo.assuntos = assuntos.value.split(",").map(x => x.trim()).filter(Boolean);
      corpo.canais = JSON.parse(canais.value); corpo.documentos = s.documentos || []; corpo.ativo = s.ativo;
      await api("/servicos/" + s.id, { method: "PUT", body: JSON.stringify(corpo) });
      msg.className = "ok"; msg.textContent = "Salvo. Nova versão criada e o atendimento já usa o texto novo.";
    } catch (e) { msg.className = "erro"; msg.textContent = "Não foi salvo: " + e.message; }
  });
  box.replaceChildren(el("h2", { textContent: "Editar: " + s.nome }), form);
}

document.getElementById("entrar").addEventListener("click", async () => {
  TOKEN = document.getElementById("token").value.trim();
  try { await ABAS.indicadores(); document.getElementById("login").hidden = true; document.getElementById("abas").hidden = false; box.hidden = false; }
  catch (e) { document.getElementById("msg-login").textContent = "Chave inválida."; }
});
document.querySelectorAll("#abas button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#abas button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  ABAS[b.dataset.aba]().catch(e => box.replaceChildren(el("p", { className: "erro", textContent: e.message })));
}));

// modo demonstração: entra sem chave
fetch("/api/demo").then(r => r.json()).then(d => { if (d.aberto) document.getElementById("entrar").click(); }).catch(() => {});
