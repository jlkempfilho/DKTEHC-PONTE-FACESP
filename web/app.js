const chat = document.getElementById("chat"), form = document.getElementById("form"), campo = document.getElementById("msg"), botao = document.getElementById("enviar");
let sessao = null;
// Link vira clicável sem usar innerHTML: o texto continua texto, só o endereço https vira <a>. Pontuação final fica de fora.
const URL_RE = /https:\/\/[^\s<>"'\[\]()]+/g;
function comLinks(d, texto) {
  let ultimo = 0;
  for (const m of texto.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:)]+$/, "");
    d.append(texto.slice(ultimo, m.index));
    const a = document.createElement("a");
    a.href = url; a.textContent = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    d.append(a);
    ultimo = m.index + url.length;
  }
  d.append(texto.slice(ultimo));
}
function bolha(texto, classe) { const d = document.createElement("div"); d.className = "msg " + classe; comLinks(d, texto); chat.appendChild(d); chat.scrollTop = chat.scrollHeight; return d; }
function etiqueta(texto) { const d = document.createElement("div"); d.className = "tag"; d.textContent = texto; chat.appendChild(d); }
async function enviar(texto) {
  document.getElementById("sugestoes")?.remove();
  bolha(texto, "eu"); campo.value = ""; botao.disabled = true;
  const espera = document.createElement("div"); espera.className = "digitando"; espera.textContent = (window.NOME_ASSISTENTE || "A assistente") + " está escrevendo..."; chat.appendChild(espera);
  try {
    const r = await fetch("/api/atender", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem: texto, municipio: document.getElementById("municipio").value.trim() || null, sessao }) });
    const d = await r.json();
    espera.remove();
    if (!r.ok) { bolha(d.detail || "Não consegui responder agora. Tente de novo em instantes.", "ag"); return; }
    sessao = d.sessao;
    bolha(d.resposta, d.tipo === "urgencia" ? "ag urg" : "ag"); falar(d.resposta);
    if (d.humano) etiqueta("Encaminhado para atendimento humano");
  } catch (e) { espera.remove(); bolha("Sem conexão com o atendimento. Verifique sua internet e tente de novo.", "ag"); }
  finally { botao.disabled = false; campo.focus(); }
}
form.addEventListener("submit", e => { e.preventDefault(); const t = campo.value.trim(); if (t) enviar(t); });
campo.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
document.querySelectorAll("#sugestoes button").forEach(b => b.addEventListener("click", () => enviar(b.textContent)));

fetch("/api/persona").then(r => r.json()).then(p => {
  window.NOME_ASSISTENTE = p.nome;
  const primeira = document.querySelector(".msg.ag"); if (primeira) primeira.textContent = p.saudacao;
  const aviso = document.querySelector(".aviso"); if (aviso) aviso.textContent = p.nome + ": atendimento automático para lojistas associados. Protótipo do Hackathon Connect 7.0 (desafio FACESP), com soluções e empresas fictícias.";
}).catch(() => {});

// ---- Áudio (CAN.2). Entrada: grava no navegador e a transcrição é feita no servidor local (Whisper).
// Saída: leitura em voz pelo sintetizador do próprio aparelho, só com vozes locais (localService): nada vai para serviço externo.
const btnGravar = document.getElementById("gravar"), chkOuvir = document.getElementById("ouvir");
let gravador = null, pedacos = [];
// a lista de vozes carrega de forma assíncrona: a 1a chamada a getVoices() volta vazia (era o "sem voz" falso)
const vozesProntas = new Promise(ok => {
  if (!("speechSynthesis" in window) || speechSynthesis.getVoices().length) return ok();
  speechSynthesis.addEventListener("voiceschanged", ok, { once: true }); setTimeout(ok, 3000);
});
let tocando = null;
async function falar(texto) {
  if (!chkOuvir.checked) return;
  // 1o: voz da persona gerada no servidor (Kokoro, local). Se falhar, a voz do próprio aparelho.
  if (sessao) {
    const vez = Symbol(); tocando = vez;            // resposta nova interrompe a leitura da anterior
    const url = i => "/api/voz?sessao=" + encodeURIComponent(sessao) + "&parte=" + i + "&r=" + Date.now();
    let atual = new Audio(url(0));
    try {
      for (let i = 0; tocando === vez; i++) {
        await atual.play();
        const proxima = new Audio(url(i + 1)); proxima.preload = "auto";   // gera a próxima frase enquanto esta toca
        await new Promise(fim => { atual.onended = fim; atual.onerror = fim; });
        atual = proxima;
      }
      return;
    } catch (e) {
      if (atual.src.endsWith("&parte=0") || atual.src.includes("&parte=0&")) falarNoAparelho(texto);   // nem a 1a frase veio: voz do aparelho
      return;                                                   // fim normal: a parte seguinte não existe (404)
    }
  }
  falarNoAparelho(texto);
}
async function falarNoAparelho(texto) {
  if (!("speechSynthesis" in window)) return;
  await vozesProntas;
  const vozes = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith("pt") && v.localService);
  if (!vozes.length) { etiqueta("Sem voz em português instalada neste aparelho para ler a resposta"); return; }
  const fem = /maria|francisca|luciana|vitoria|helena|female|feminina/i, masc = /daniel|antonio|ricardo|male|masculina/i;
  const quer = (window.NOME_ASSISTENTE || "").startsWith("Marco") ? masc : fem;
  const u = new SpeechSynthesisUtterance(texto);
  u.voice = vozes.find(v => quer.test(v.name)) || vozes[0]; u.lang = u.voice.lang; u.rate = 1.0;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
async function enviarAudio(blob) {
  const espera = document.createElement("div"); espera.className = "digitando"; espera.textContent = "Ouvindo o seu áudio..."; chat.appendChild(espera);
  const fd = new FormData();
  fd.append("audio", blob, "mensagem.webm");
  const cid = document.getElementById("municipio").value.trim(); if (cid) fd.append("municipio", cid);
  if (sessao) fd.append("sessao", sessao);
  botao.disabled = true; btnGravar.disabled = true;
  try {
    const r = await fetch("/api/audio", { method: "POST", body: fd });
    const d = await r.json(); espera.remove();
    if (!r.ok) { bolha(d.detail || "Não consegui ouvir o áudio agora.", "ag"); return; }
    sessao = d.sessao;
    if (d.transcricao) bolha(d.transcricao, "eu");   // a fala aparece como se tivesse sido digitada
    bolha(d.resposta, d.tipo === "urgencia" ? "ag urg" : "ag"); falar(d.resposta);
    if (d.humano) etiqueta("Encaminhado para atendimento humano");
  } catch (e) { espera.remove(); bolha("Sem conexão com o atendimento. Tente de novo.", "ag"); }
  finally { botao.disabled = false; btnGravar.disabled = false; }
}
btnGravar.addEventListener("click", async () => {
  if (gravador && gravador.state === "recording") { gravador.stop(); return; }
  try {
    const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
    pedacos = []; gravador = new MediaRecorder(fluxo);
    gravador.ondataavailable = e => e.data.size && pedacos.push(e.data);
    gravador.onstop = () => { fluxo.getTracks().forEach(t => t.stop()); btnGravar.textContent = "Falar"; btnGravar.setAttribute("aria-pressed", "false");
                              document.getElementById("sugestoes")?.remove(); enviarAudio(new Blob(pedacos, { type: gravador.mimeType || "audio/webm" })); };
    gravador.start(); btnGravar.textContent = "Parar"; btnGravar.setAttribute("aria-pressed", "true");
  } catch (e) {
    // a causa muda o que a pessoa precisa fazer: dizer qual é (o nome técnico vai junto para o suporte)
    const motivo = { NotAllowedError: "o navegador ou o sistema bloqueou o microfone. Libere o acesso nas configurações",
                     NotFoundError: "não encontrei nenhum microfone ligado ao computador",
                     NotReadableError: "o microfone está sendo usado por outro programa (uma chamada, por exemplo). Feche-o e tente de novo" }[e.name]
                   || "o microfone não respondeu";
    bolha(`Não consegui usar o microfone: ${motivo}. Você também pode escrever a mensagem. (${e.name || "erro"})`, "ag");
  }
});

// documento de uma trilha (onboarding etc.): no WhatsApp é a mídia recebida
document.getElementById("arquivo").addEventListener("change", async ev => {
  const f = ev.target.files[0]; ev.target.value = "";
  if (!f) return;
  if (!sessao) { bolha("Antes de mandar um documento, me conta o que você precisa.", "ag"); return; }
  bolha("Documento enviado: " + f.name, "eu");
  const fd = new FormData(); fd.append("sessao", sessao); fd.append("arquivo", f);
  try {
    const r = await fetch("/api/documento", { method: "POST", body: fd });
    const d = await r.json();
    bolha(r.ok ? d.resposta : (d.detail || "Não consegui receber o documento."), "ag");
  } catch (e) { bolha("Sem conexão com o atendimento.", "ag"); }
});
