/* ============================================================================
   Assistant IA — module réutilisable (MAQUETTE, réponses simulées)
   Autonome : injecte son propre CSS, indépendant du framework CSS de l'app.
   mountAiWidget(config) crée le FAB + le panneau (chat + recommandations) et
   renvoie une fonction de démontage. Le même moteur sert dans toutes les apps —
   seule la `config` métier change. Le branchement d'un vrai LLM se fera dans
   reply()/send() (remplacer la réponse simulée par un appel backend).
============================================================================ */
const PREFIX = "aiw";

function hexA(hex, a) {
  let h = (hex || "#6366f1").replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function mountAiWidget(config = {}) {
  if (typeof document === "undefined") return () => {};
  // évite le double-montage (StrictMode, navigations)
  const existing = document.getElementById(PREFIX);
  if (existing) return () => existing.remove();

  const ACCENT = config.accent || "#6366f1";
  const ACCENT2 = config.accent2 || "#4338ca";
  const APP = config.app || "NgoluApp";
  const RECO = config.reco || [];
  const PROMPTS = config.prompts || [];
  const REPLIES = config.replies || [];
  const GREET = config.greeting ||
    `Bonjour 👋 Je suis ton assistant IA. Je peux analyser ${APP} et te proposer des pistes pour améliorer ton projet. Pose-moi une question, ou ouvre l’onglet Recommandations.`;

  /* ---------- CSS ---------- */
  const css = `
#${PREFIX},#${PREFIX} *{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
#${PREFIX}{--ai:${ACCENT};--ai2:${ACCENT2};}
.${PREFIX}-fab{position:fixed;right:22px;bottom:22px;width:58px;height:58px;border:none;border-radius:50%;cursor:pointer;z-index:99998;background:linear-gradient(135deg,var(--ai),var(--ai2));box-shadow:0 14px 30px -8px rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;transition:transform .18s;}
.${PREFIX}-fab:hover{transform:translateY(-2px) scale(1.04);}
.${PREFIX}-ping{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,var(--ai),var(--ai2));opacity:.5;animation:${PREFIX}ping 2.4s cubic-bezier(0,0,.2,1) infinite;z-index:-1;}
@keyframes ${PREFIX}ping{0%{transform:scale(1);opacity:.5}70%,100%{transform:scale(1.7);opacity:0}}
.${PREFIX}-badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;}
.${PREFIX}-ov{position:fixed;inset:0;background:rgba(15,23,42,.38);backdrop-filter:blur(2px);z-index:99998;opacity:0;pointer-events:none;transition:opacity .25s;}
#${PREFIX}.open .${PREFIX}-ov{opacity:1;pointer-events:auto;}
.${PREFIX}-panel{position:fixed;top:0;right:0;height:100%;width:400px;max-width:94vw;background:#fff;z-index:99999;display:flex;flex-direction:column;box-shadow:-24px 0 60px -20px rgba(15,23,42,.4);transform:translateX(104%);transition:transform .32s cubic-bezier(.4,0,.2,1);}
#${PREFIX}.open .${PREFIX}-panel{transform:translateX(0);}
.${PREFIX}-head{padding:16px 16px 12px;background:linear-gradient(135deg,var(--ai),var(--ai2));color:#fff;display:flex;align-items:center;justify-content:space-between;}
.${PREFIX}-head-l{display:flex;align-items:center;gap:10px;}
.${PREFIX}-logo{width:34px;height:34px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;}
.${PREFIX}-title{font-weight:700;font-size:15px;}.${PREFIX}-sub{font-size:11px;opacity:.85;}
.${PREFIX}-x{background:rgba(255,255,255,.16);border:none;color:#fff;width:30px;height:30px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.${PREFIX}-x:hover{background:rgba(255,255,255,.28);}
.${PREFIX}-tabs{display:flex;gap:4px;padding:8px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;}
.${PREFIX}-tab{flex:1;border:none;background:transparent;padding:8px;border-radius:9px;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;}
.${PREFIX}-tab.is-on{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(15,23,42,.08);}
.${PREFIX}-pill{background:var(--ai);color:#fff;font-size:10px;font-weight:700;min-width:17px;height:17px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;}
.${PREFIX}-pane{flex:1;min-height:0;display:none;flex-direction:column;}.${PREFIX}-pane.is-on{display:flex;}
.${PREFIX}-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}
.${PREFIX}-msg{max-width:84%;padding:10px 12px;border-radius:14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;}
.${PREFIX}-msg.bot{background:#fff;border:1px solid #e7ecf2;color:#0f172a;border-bottom-left-radius:5px;align-self:flex-start;}
.${PREFIX}-msg.me{background:linear-gradient(135deg,var(--ai),var(--ai2));color:#fff;border-bottom-right-radius:5px;align-self:flex-end;}
.${PREFIX}-msg.typing{color:#94a3b8;font-style:italic;}
.${PREFIX}-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;background:#f8fafc;}
.${PREFIX}-chip{border:1px solid #d8e0ea;background:#fff;color:#334155;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;line-height:1.2;}
.${PREFIX}-chip:hover{border-color:var(--ai);color:var(--ai);}
.${PREFIX}-input{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e7ecf2;background:#fff;}
.${PREFIX}-input input{flex:1;border:1px solid #d8e0ea;border-radius:12px;padding:10px 12px;font-size:13.5px;outline:none;}
.${PREFIX}-input input:focus{border-color:var(--ai);box-shadow:0 0 0 3px ${hexA(ACCENT, 0.14)};}
.${PREFIX}-send{border:none;border-radius:12px;width:42px;cursor:pointer;background:linear-gradient(135deg,var(--ai),var(--ai2));display:flex;align-items:center;justify-content:center;}
.${PREFIX}-foot{font-size:10.5px;color:#94a3b8;text-align:center;padding:6px 10px 10px;background:#fff;}
.${PREFIX}-recolist{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}
.${PREFIX}-rc{background:#fff;border:1px solid #e7ecf2;border-radius:14px;padding:12px 13px;}
.${PREFIX}-rc-h{display:flex;align-items:center;gap:9px;margin-bottom:5px;}
.${PREFIX}-rc-ic{width:30px;height:30px;border-radius:9px;background:${hexA(ACCENT, 0.12)};display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;}
.${PREFIX}-rc-t{font-weight:600;font-size:13.5px;color:#0f172a;flex:1;}
.${PREFIX}-rc-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ai);background:${hexA(ACCENT, 0.1)};padding:2px 7px;border-radius:999px;}
.${PREFIX}-rc-x{font-size:12.5px;color:#475569;line-height:1.5;}
.${PREFIX}-rc-act{margin-top:9px;display:flex;gap:7px;}
.${PREFIX}-rc-btn{font-size:12px;font-weight:600;border:none;border-radius:9px;padding:6px 11px;cursor:pointer;background:linear-gradient(135deg,var(--ai),var(--ai2));color:#fff;}
.${PREFIX}-rc-btn.ghost{background:#fff;border:1px solid #d8e0ea;color:#475569;}
@media(max-width:480px){.${PREFIX}-panel{width:100vw;}.${PREFIX}-fab{right:16px;bottom:80px;}}`;

  const st = document.createElement("style");
  st.setAttribute("data-aiw", "1");
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- SVG ---------- */
  const SP = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.9L12 16l-1.8-4.7L5.5 9.4l4.7-1.8L12 3z"/><path d="M19 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"/></svg>';
  const XI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const SEND = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  /* ---------- DOM ---------- */
  const root = document.createElement("div");
  root.id = PREFIX;
  root.innerHTML =
    `<button class="${PREFIX}-fab" aria-label="Assistant IA" data-fab><span class="${PREFIX}-ping"></span>${SP}` +
      (RECO.length ? `<span class="${PREFIX}-badge">${RECO.length}</span>` : "") + "</button>" +
    `<div class="${PREFIX}-ov" data-ov></div>` +
    `<aside class="${PREFIX}-panel" role="dialog" aria-label="Assistant IA">` +
      `<div class="${PREFIX}-head"><div class="${PREFIX}-head-l"><span class="${PREFIX}-logo">${SP}</span>` +
        `<div><div class="${PREFIX}-title">Assistant IA</div><div class="${PREFIX}-sub">${esc(APP)}</div></div></div>` +
        `<button class="${PREFIX}-x" data-x>${XI}</button></div>` +
      `<div class="${PREFIX}-tabs"><button class="${PREFIX}-tab is-on" data-tab="chat">Assistant</button>` +
        `<button class="${PREFIX}-tab" data-tab="reco">Recommandations${RECO.length ? ` <span class="${PREFIX}-pill">${RECO.length}</span>` : ""}</button></div>` +
      `<section class="${PREFIX}-pane is-on" data-pane="chat">` +
        `<div class="${PREFIX}-msgs" data-msgs></div>` +
        `<div class="${PREFIX}-chips" data-chips></div>` +
        `<form class="${PREFIX}-input" data-form><input data-text placeholder="Pose ta question…" autocomplete="off"/><button class="${PREFIX}-send" type="submit">${SEND}</button></form>` +
        `<div class="${PREFIX}-foot">Maquette — réponses simulées · branchement LLM à venir</div>` +
      `</section>` +
      `<section class="${PREFIX}-pane" data-pane="reco"><div class="${PREFIX}-recolist" data-recolist></div></section>` +
    `</aside>`;
  document.body.appendChild(root);

  const msgs = root.querySelector("[data-msgs]");
  const chips = root.querySelector("[data-chips]");
  const input = root.querySelector("[data-text]");
  const rl = root.querySelector("[data-recolist]");

  rl.innerHTML = RECO.map((r) =>
    `<div class="${PREFIX}-rc"><div class="${PREFIX}-rc-h"><span class="${PREFIX}-rc-ic">${r.icon || "💡"}</span>` +
    `<span class="${PREFIX}-rc-t">${esc(r.title)}</span>${r.tag ? `<span class="${PREFIX}-rc-tag">${esc(r.tag)}</span>` : ""}</div>` +
    `<div class="${PREFIX}-rc-x">${esc(r.text)}</div>` +
    `<div class="${PREFIX}-rc-act"><button class="${PREFIX}-rc-btn" data-ask="${esc(r.title)}">Demander à l’IA</button>` +
    `<button class="${PREFIX}-rc-btn ghost" data-ignore>Ignorer</button></div></div>`
  ).join("") || `<div style="color:#94a3b8;font-size:13px;text-align:center;padding:24px">Aucune recommandation pour le moment.</div>`;

  chips.innerHTML = PROMPTS.map((p) => `<button class="${PREFIX}-chip">${esc(p)}</button>`).join("");

  /* ---------- Logique ---------- */
  function open(tab) { root.classList.add("open"); if (tab) setTab(tab); const b = root.querySelector(`.${PREFIX}-badge`); if (b) b.style.display = "none"; setTimeout(() => input && input.focus(), 350); }
  function close() { root.classList.remove("open"); }
  function setTab(name) {
    root.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => t.classList.toggle("is-on", t.dataset.tab === name));
    root.querySelectorAll(`.${PREFIX}-pane`).forEach((p) => p.classList.toggle("is-on", p.dataset.pane === name));
  }
  function add(text, who) { const d = document.createElement("div"); d.className = `${PREFIX}-msg ${who}`; d.textContent = text; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function reply(q) {
    const lc = (q || "").toLowerCase();
    const found = REPLIES.find((r) => (r.k || []).some((k) => lc.indexOf(k) !== -1));
    return found ? found.a
      : `Bonne question. D’après les données de ${APP}, voici ce que je te suggère :\n\n• je repère les écarts par rapport à tes objectifs,\n• je te propose 1 à 2 actions concrètes pour améliorer ton projet.\n\nOuvre l’onglet « Recommandations » pour les pistes prioritaires du moment.`;
  }
  function send(q) {
    q = (q || input.value || "").trim(); if (!q) return;
    add(q, "me"); input.value = "";
    const t = add("L’assistant réfléchit…", "bot typing");
    setTimeout(() => { t.remove(); typeOut(add("", "bot"), reply(q)); }, 620);
  }
  function typeOut(node, text) {
    let i = 0; node.classList.remove("typing");
    (function tick() {
      node.textContent = text.slice(0, i); msgs.scrollTop = msgs.scrollHeight;
      if (i < text.length) { i += Math.max(2, Math.round(text.length / 90)); setTimeout(tick, 14); }
      else node.textContent = text;
    })();
  }

  /* ---------- Évènements ---------- */
  root.querySelector("[data-fab]").addEventListener("click", () => open());
  root.querySelector("[data-ov]").addEventListener("click", close);
  root.querySelector("[data-x]").addEventListener("click", close);
  root.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));
  root.querySelector("[data-form]").addEventListener("submit", (e) => { e.preventDefault(); send(); });
  chips.addEventListener("click", (e) => { const c = e.target.closest(`.${PREFIX}-chip`); if (c) send(c.textContent); });
  rl.addEventListener("click", (e) => {
    const b = e.target.closest(`.${PREFIX}-rc-btn`); if (!b) return;
    if (b.dataset.ask != null) { setTab("chat"); send(`À propos de : ${b.dataset.ask} — que me recommandes-tu ?`); }
    else { const card = b.closest(`.${PREFIX}-rc`); if (card) card.style.display = "none"; }
  });
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  add(GREET, "bot");

  // API publique optionnelle
  window.AIW = { open, close, recommend: () => open("reco"), ask: (q) => { open("chat"); send(q); } };

  return function unmount() {
    document.removeEventListener("keydown", onKey);
    root.remove(); st.remove();
    if (window.AIW) delete window.AIW;
  };
}

export default mountAiWidget;
