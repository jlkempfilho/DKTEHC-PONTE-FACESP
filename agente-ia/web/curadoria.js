let TOKEN = "";
const $ = id => document.getElementById(id);
const el = (t, p = {}, ...f) => { const e = Object.assign(document.createElement(t), p); f.flat().forEach(x => x != null && e.append(x)); return e; };
async function api(c, o = {}) {
  const h = { "Authorization": "Bearer " + TOKEN, ...(o.body instanceof FormData ? {} : { "Content-Type": "application/json" }) };
  const r = await fetch("/curadoria/api" + c, { ...o, headers: h });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(Array.isArray(d.detail) ? d.detail.map(x => x.msg).join("; ") : (d.detail || "Erro " + r.status));
  return d;
}
const TIPOS = { pergunta: "Pergunta", documento: "Documento", analise: "Análise da equipe", informacao: "Informação", fim: "Fim" };
const STATUS = { pendente: "Aguardando sua validação", aprovada: "Aprovado, em uso no atendimento", rejeitada: "Rejeitado" };

// ---------- processos (POP) ----------
function cartaoTrilha(t) {
  const nome = el("input", { value: t.nome });
  const gat = el("textarea", { value: (t.gatilhos || []).join("\n") });
  const etapas = t.etapas.map(e => {
    const tipo = el("select", {}, Object.entries(TIPOS).map(([v, n]) => el("option", { value: v, textContent: n, selected: v === e.tipo })));
    const texto = el("textarea", { value: e.texto });
    const doc = el("input", { value: e.documento || "", placeholder: "Nome do documento (se for etapa de documento)" });
    const manter = el("input", { type: "checkbox", checked: true });
    const linha = el("div", { className: "etapa" },
      el("div", {}, el("div", { className: "linha" }, el("strong", { textContent: e.id }), tipo, el("label", { style: "margin:0" }, manter, " manter")), texto, doc),
      el("div", {}, el("span", { className: "selo " + (e.confere ? "ok" : "erro"), textContent: e.confere ? "trecho confere com o documento" : "sem trecho no documento: revise" }),
        el("div", { className: "origem", textContent: e.trecho_origem || "Nenhum trecho do procedimento justifica esta etapa." })));
    return { e, tipo, texto, doc, manter, linha };
  });
  const lacunas = (t.lacunas || []).map(l => ({ l, resp: el("input", { value: l.resposta || "", placeholder: "Sua resposta" }) }));
  const msg = el("span", { className: "muted" });
  const enviar = async status => {
    const corpo = { nome: nome.value.trim(), gatilhos: gat.value.split("\n").map(s => s.trim()).filter(Boolean), status,
      etapas: etapas.filter(x => x.manter.checked).map(x => ({ ...x.e, tipo: x.tipo.value, texto: x.texto.value.trim(), documento: x.doc.value.trim() || null })),
      lacunas: lacunas.map(x => ({ pergunta: x.l.pergunta, resposta: x.resp.value.trim() || null })) };
    try { await api("/trilhas/" + t.id, { method: "PUT", body: JSON.stringify(corpo) }); carregarTrilhas(); }
    catch (err) { msg.className = "erro"; msg.textContent = err.message; }
  };
  return el("article", {},
    el("div", { className: "linha" }, el("h2", { textContent: t.nome, style: "margin:0" }), el("span", { className: "selo", textContent: `${STATUS[t.status]} · versão ${t.versao}` })),
    el("p", { className: "muted", textContent: `Lido de: ${t.fonte_nome}. Para cada etapa, à direita está o trecho do documento que a justifica.` }),
    el("label", { textContent: "Nome do processo" }), nome,
    el("label", { textContent: "Como o associado costuma pedir (uma frase por linha)" }), gat,
    el("h3", { textContent: "Etapas" }), etapas.map(x => x.linha),
    lacunas.length ? [el("h3", { textContent: "O documento não diz (responda antes de aprovar)" }),
      lacunas.map(x => el("div", {}, el("label", { textContent: x.l.pergunta }), x.resp))] : null,
    el("p", { className: "linha" }, el("button", { className: "pri", type: "button", textContent: "Aprovar e colocar no atendimento", onclick: () => enviar("aprovada") }),
      el("button", { type: "button", textContent: "Salvar sem aprovar", onclick: () => enviar("pendente") }),
      el("button", { type: "button", textContent: "Rejeitar", onclick: () => enviar("rejeitada") }), msg));
}
async function carregarTrilhas() { $("trilhas").replaceChildren(...(await api("/trilhas")).map(cartaoTrilha)); }
$("propor").onclick = async () => {
  const f = $("pop").files[0], m = $("msg-pop");
  if (!f) { m.textContent = "Escolha o arquivo do procedimento."; return; }
  m.className = "muted"; m.textContent = "Lendo o procedimento, isso leva alguns segundos...";
  const fd = new FormData(); fd.append("arquivo", f);
  try { await api("/trilhas/propor", { method: "POST", body: fd }); m.textContent = "Proposta pronta. Revise abaixo."; carregarTrilhas(); }
  catch (e) { m.className = "erro"; m.textContent = e.message; }
};

// ---------- documentos ----------
async function carregarDocumentos() {
  const ds = await api("/documentos");
  $("aba-documentos").replaceChildren(...(ds.length ? ds.map(d => {
    const motivo = el("input", { placeholder: "Motivo, se for devolver (o associado recebe esta frase)" });
    const msg = el("span", { className: "muted" });
    const decidir = async status => {
      try { await api("/documentos/" + d.id, { method: "POST", body: JSON.stringify({ status, motivo: motivo.value.trim() || null }) }); carregarDocumentos(); }
      catch (e) { msg.className = "erro"; msg.textContent = e.message; }
    };
    const ver = el("button", { type: "button", textContent: "Ver arquivo" });
    ver.onclick = async () => {
      const r = await fetch(`/curadoria/api/documentos/${d.id}/arquivo`, { headers: { "Authorization": "Bearer " + TOKEN } });
      window.open(URL.createObjectURL(await r.blob()), "_blank", "noopener");
    };
    return el("article", {}, el("h2", { textContent: d.documento }),
      el("p", { className: "muted", textContent: `${d.trilha_nome} · enviado em ${new Date(d.enviado_em).toLocaleString("pt-BR")}` }),
      motivo, el("p", { className: "linha" }, ver, el("button", { className: "pri", type: "button", textContent: "Aceitar", onclick: () => decidir("aceito") }),
        el("button", { type: "button", textContent: "Devolver", onclick: () => decidir("devolvido") }), msg));
  }) : [el("section", { textContent: "Nenhum documento aguardando análise." })]));
}

// ---------- soluções ----------
const CAMPOS = [["id", "Identificador (ex.: estoque-foto)"], ["nome", "Nome da solução"], ["empresa", "Empresa ou startup"], ["problema", "Problema que resolve"],
  ["publico", "Para quem"], ["assuntos", "Como o lojista descreve o problema (separe por vírgula)"], ["requisitos", "Requisitos (separe por vírgula)"],
  ["maturidade", "Maturidade e o que não atende"], ["teste", "Condições de teste e resultado esperado"], ["custo", "Custo indicativo"], ["demonstracao", "Link da demonstração (https://)"]];
function formSolucao(form, enviar) {
  form.replaceChildren(...CAMPOS.map(([n, t]) => el("div", {}, el("label", { textContent: t }), el(["problema", "maturidade", "teste"].includes(n) ? "textarea" : "input", { name: n, required: n !== "requisitos" }))),
    el("p", { className: "linha" }, el("button", { className: "pri", type: "submit", textContent: "Enviar" }), el("span", { className: "muted" })));
  form.onsubmit = async ev => {
    ev.preventDefault(); const m = form.querySelector("p span");
    const d = Object.fromEntries(new FormData(form));
    d.assuntos = d.assuntos.split(",").map(s => s.trim()).filter(Boolean); d.requisitos = d.requisitos.split(",").map(s => s.trim()).filter(Boolean);
    try { await enviar(d); m.className = "ok"; m.textContent = "Enviado."; form.reset(); } catch (e) { m.className = "erro"; m.textContent = e.message; }
  };
}
async function carregarPropostas() {
  const ps = await api("/solucoes/propostas");
  $("propostas").replaceChildren(el("h2", { textContent: "Soluções cadastradas por startups" }), ...(ps.length ? ps.map(p => {
    const dec = async status => { const fd = new FormData(); fd.append("status", status); await api(`/solucoes/propostas/${p.id}`, { method: "POST", body: fd }); carregarPropostas(); };
    return el("article", {}, el("h2", { textContent: `${p.dados.nome} · ${p.startup}` }), el("p", { textContent: p.dados.problema }),
      el("p", { className: "muted", textContent: `Para quem: ${p.dados.publico} · Teste: ${p.dados.teste} · Custo: ${p.dados.custo} · ${STATUS[p.status === "aprovada" ? "aprovada" : p.status] || p.status}` }),
      p.status === "pendente" ? el("p", { className: "linha" }, el("button", { className: "pri", type: "button", textContent: "Aprovar e incluir no catálogo", onclick: () => dec("aprovada") }),
        el("button", { type: "button", textContent: "Rejeitar", onclick: () => dec("rejeitada") })) : null);
  }) : [el("p", { className: "muted", textContent: "Nenhuma solução enviada por startup ainda." })]));
}

// ---------- navegação ----------
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  ["trilhas", "documentos", "solucoes"].forEach(a => $("aba-" + a).hidden = a !== b.dataset.aba);
  ({ trilhas: carregarTrilhas, documentos: carregarDocumentos, solucoes: carregarPropostas })[b.dataset.aba]();
});
$("entrar").onclick = async () => {
  TOKEN = $("token").value.trim();
  try { await carregarTrilhas(); $("login").hidden = true; $("app").hidden = false;
    formSolucao($("form-sol"), d => api("/solucoes", { method: "POST", body: JSON.stringify(d) })); }
  catch (e) { $("msg").className = "erro"; $("msg").textContent = e.message; }
};
// modo demonstração: entra sem chave
fetch("/api/demo").then(r => r.json()).then(d => { if (d.aberto) $("entrar").click(); }).catch(() => {});
