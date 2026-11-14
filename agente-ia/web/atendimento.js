// Fila do atendimento humano: só DOM seguro (textContent), nunca innerHTML com dado do cidadão.
let TOKEN = "", STATUS = "aguardando";
const box = document.getElementById("conteudo");
const el = (tag, props = {}, ...filhos) => { const e = Object.assign(document.createElement(tag), props); filhos.forEach(f => e.append(f)); return e; };

async function api(caminho, opcoes = {}) {
  const r = await fetch("/atendimento/api" + caminho, { ...opcoes, headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" } });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || ("erro " + r.status));
  return r.json();
}

async function carregar() {
  const d = await api("/fila?status=" + STATUS);
  document.getElementById("quem").textContent = "Você: " + d.atendente;
  const t = el("table"); const h = el("tr");
  ["Quando", "Motivo", "Serviço e cidade", "O que o cidadão disse", "Responsável", "Ação"].forEach(c => h.append(el("th", { textContent: c })));
  t.append(el("thead", {}, h)); const b = el("tbody");
  d.itens.forEach(x => {
    const msg = el("span", { className: "muted" });
    const mover = (st, rotulo) => el("button", { type: "button", textContent: rotulo, onclick: async () => {
      try { await api("/fila/" + x.conversa_id, { method: "POST", body: JSON.stringify({ status: st }) }); carregar(); }
      catch (e) { msg.className = "erro"; msg.textContent = e.message; } } });
    const acoes = el("span", {}); if (x.status === "aguardando") acoes.append(mover("assumido", "Assumir"), " "); if (x.status !== "concluido") acoes.append(mover("concluido", "Concluir"), " "); acoes.append(msg);
    const tr = el("tr");
    [x.criado_em.slice(0, 16), el("b", { className: x.urgente ? "erro" : "", textContent: x.urgente ? "URGENTE · " + x.motivo : x.motivo }),
     [x.servico_id, x.municipio].filter(Boolean).join(" · ") || "-", el("span", {}, x.resumo, el("br"), el("small", { className: "muted", textContent: "relato some em " + x.expira_em.slice(0, 10) })),
     x.atendente || "-", acoes].forEach(c => tr.append(c instanceof Node ? el("td", {}, c) : el("td", { textContent: c })));
    b.append(tr);
  });
  t.append(b);
  box.replaceChildren(d.itens.length ? t : el("p", { textContent: "Nenhuma conversa nesta situação." }));
}

document.getElementById("entrar").addEventListener("click", async () => {
  TOKEN = document.getElementById("token").value.trim();
  try { await carregar(); document.getElementById("login").hidden = true; document.getElementById("abas").hidden = false; box.hidden = false; }
  catch (e) { document.getElementById("msg-login").textContent = "Chave inválida ou desativada."; }
});
document.querySelectorAll("#abas button").forEach(b => b.addEventListener("click", () => {
  STATUS = b.dataset.status;
  document.querySelectorAll("#abas button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  carregar().catch(e => box.replaceChildren(el("p", { className: "erro", textContent: e.message })));
}));

// modo demonstração: entra sem chave
fetch("/api/demo").then(r => r.json()).then(d => { if (d.aberto) document.getElementById("entrar").click(); }).catch(() => {});
