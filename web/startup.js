let TOKEN = "";
const el = (t, p = {}, ...f) => { const e = Object.assign(document.createElement(t), p); f.flat().forEach(x => x != null && e.append(x)); return e; };
async function api(c, o = {}) {
  const r = await fetch("/startup/api" + c, { ...o, headers: { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || "Erro " + r.status);
  return d;
}
const NOMES = { esclarecimento: "Pedido de esclarecimento", adaptacao: "Proposta de adaptação", piloto: "Proposta de piloto" };
const lista = v => (v && v.length ? v.join(", ") : "não informado");
function card(d) {
  const f = el("form");
  f.append(
    el("label", { textContent: "Nome da startup" }), el("input", { name: "startup", required: true, maxLength: 80 }),
    el("label", { textContent: "Tipo de resposta" }),
    el("select", { name: "tipo" }, Object.entries(NOMES).map(([v, t]) => el("option", { value: v, textContent: t }))),
    el("label", { textContent: "Mensagem para a associação e as lojas" }), el("textarea", { name: "texto", required: true, maxLength: 2000 }),
    el("div", { className: "piloto", hidden: true }, ["responsavel:Responsável", "proximo_passo:Próximo passo", "indicador:Indicador", "ponto_partida:Ponto de partida", "resultado_esperado:Resultado esperado"]
      .map(s => { const [n, t] = s.split(":"); return el("div", {}, el("label", { textContent: t }), el("input", { name: n, maxLength: 300 })); })),
    el("p", {}, el("button", { type: "submit", textContent: "Enviar" }), " ", el("span", { className: "muted" })));
  f.tipo.onchange = () => { f.querySelector(".piloto").hidden = f.tipo.value !== "piloto"; };
  f.onsubmit = async ev => {
    ev.preventDefault(); const st = f.querySelector("p span");
    const corpo = Object.fromEntries([...new FormData(f)].filter(([, v]) => v.trim()));
    try { await api(`/demandas/${d.grupo}/respostas`, { method: "POST", body: JSON.stringify(corpo) }); carregar(); }
    catch (e) { st.className = "erro"; st.textContent = e.message; }
  };
  return el("article", {},
    el("div", { className: "top" }, el("h2", { textContent: `${d.codigo} · ${d.problema}` }),
      el("span", { className: "tag", textContent: `${d.lojas} ${d.lojas === 1 ? "loja relatou" : "lojas relataram"} · ${d.status.replace("_", " ")}` })),
    el("dl", {},
      el("dt", { textContent: "Segmento" }), el("dd", { textContent: lista(d.segmentos) }),
      el("dt", { textContent: "Território" }), el("dd", { textContent: lista(d.territorios) }),
      el("dt", { textContent: "Canal de venda" }), el("dd", { textContent: lista(d.canais) }),
      el("dt", { textContent: "Frequência" }), el("dd", { textContent: lista(d.frequencia) }),
      el("dt", { textContent: "Como resolve hoje" }), el("dd", { textContent: d.pratica_atual }),
      el("dt", { textContent: "Sistemas que usa" }), el("dd", { textContent: lista(d.sistemas) }),
      el("dt", { textContent: "Restrições" }), el("dd", { textContent: lista(d.restricoes) }),
      el("dt", { textContent: "Resultado esperado" }), el("dd", { textContent: d.resultado_esperado })),
    d.respostas.map(r => el("div", { className: "resp" },
      el("strong", { textContent: `${NOMES[r.tipo]} · ${r.startup}` }), el("div", { textContent: r.texto }),
      r.tipo === "piloto" ? el("div", { className: "muted", textContent: `Responsável: ${r.responsavel} · Próximo passo: ${r.proximo_passo} · Indicador: ${r.indicador}` + (r.ponto_partida ? ` · Ponto de partida: ${r.ponto_partida}` : "") + (r.resultado_esperado ? ` · Resultado esperado: ${r.resultado_esperado}` : "") }) : null)),
    el("details", {}, el("summary", { textContent: "Responder a esta demanda" }), f));
}
async function carregar() {
  const box = document.getElementById("lista");
  const ds = await api("/demandas");
  box.replaceChildren(...(ds.length ? ds.map(card) : [el("section", { textContent: "Nenhuma demanda registrada ainda." })]));
  box.hidden = false; document.getElementById("login").hidden = true; document.getElementById("cadastro").hidden = false;
  box.style.display = "flex"; box.style.flexDirection = "column"; box.style.gap = "16px";
}
document.getElementById("entrar").onclick = async () => {
  TOKEN = document.getElementById("token").value.trim();
  try { await carregar(); } catch (e) { const m = document.getElementById("msg"); m.className = "erro"; m.textContent = e.message; }
};

// modo demonstração: entra sem chave
fetch("/api/demo").then(r => r.json()).then(d => { if (d.aberto) document.getElementById("entrar").click(); }).catch(() => {});

// cadastro de solução pela startup (vai para a curadoria)
const CAMPOS_SOL = [["id", "Identificador (ex.: estoque-foto)"], ["nome", "Nome da solução"], ["empresa", "Nome da startup"], ["problema", "Problema que resolve"],
  ["publico", "Para quem"], ["assuntos", "Como o lojista descreve o problema (separe por vírgula)"], ["requisitos", "Requisitos (separe por vírgula)"],
  ["maturidade", "Maturidade e o que não atende"], ["teste", "Condições de teste e resultado esperado"], ["custo", "Custo indicativo"], ["demonstracao", "Link da demonstração (https://)"]];
const fs = document.getElementById("form-sol");
fs.replaceChildren(...CAMPOS_SOL.map(([n, t]) => el("div", {}, el("label", { textContent: t }), el(["problema", "maturidade", "teste"].includes(n) ? "textarea" : "input", { name: n, required: n !== "requisitos" }))),
  el("p", {}, el("button", { type: "submit", textContent: "Enviar para a curadoria" }), " ", el("span", { className: "muted" })));
fs.onsubmit = async ev => {
  ev.preventDefault(); const m = fs.querySelector("p span");
  const d = Object.fromEntries(new FormData(fs));
  d.assuntos = d.assuntos.split(",").map(s => s.trim()).filter(Boolean); d.requisitos = d.requisitos.split(",").map(s => s.trim()).filter(Boolean);
  try { await api("/solucoes", { method: "POST", body: JSON.stringify(d) }); m.className = "ok"; m.textContent = "Enviada para a curadoria."; fs.reset(); }
  catch (e) { m.className = "erro"; m.textContent = e.message; }
};
