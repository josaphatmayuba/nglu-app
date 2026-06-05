/* ============================================================================
   Assistant IA — widget réutilisable (MAQUETTE, réponses simulées)
   Autonome : injecte son propre CSS, n'a besoin ni de Tailwind ni de lucide.
   Usage dans un mockup, juste avant </body> :
     <script>window.AIW_CONFIG = { app:'…', accent:'#…', accent2:'#…',
       greeting:'…', prompts:[…], reco:[{icon,title,text,tag}], replies:[{k:[],a}] };</script>
     <script src="../_shared/ai-widget.js"></script>
   Le même fichier sert à toutes les apps — seule la config change.
============================================================================ */
(function () {
  var C = window.AIW_CONFIG || {};
  var ACCENT = C.accent || '#6366f1';
  var ACCENT2 = C.accent2 || '#4338ca';
  var APP = C.app || 'NgoluApp';
  var RECO = C.reco || [];
  var PROMPTS = C.prompts || [];
  var REPLIES = C.replies || [];
  var GREET = C.greeting || ('Bonjour 👋 Je suis ton assistant IA. Je peux analyser ' + APP + ' et te proposer des pistes pour améliorer ton projet. Pose-moi une question, ou ouvre l’onglet Recommandations.');

  /* ---------- CSS ---------- */
  var css = ''
  + '#aiw,#aiw *{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}'
  + '#aiw{--ai:' + ACCENT + ';--ai2:' + ACCENT2 + ';}'
  + '.aiw-fab{position:fixed;right:22px;bottom:22px;width:58px;height:58px;border:none;border-radius:50%;cursor:pointer;z-index:99998;'
  + 'background:linear-gradient(135deg,var(--ai),var(--ai2));box-shadow:0 14px 30px -8px rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;transition:transform .18s;}'
  + '.aiw-fab:hover{transform:translateY(-2px) scale(1.04);}'
  + '.aiw-fab svg{filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));}'
  + '.aiw-fab .aiw-ping{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,var(--ai),var(--ai2));opacity:.55;animation:aiwping 2.4s cubic-bezier(0,0,.2,1) infinite;z-index:-1;}'
  + '@keyframes aiwping{0%{transform:scale(1);opacity:.5}70%,100%{transform:scale(1.7);opacity:0}}'
  + '.aiw-badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;}'
  + '.aiw-ov{position:fixed;inset:0;background:rgba(15,23,42,.38);backdrop-filter:blur(2px);z-index:99998;opacity:0;pointer-events:none;transition:opacity .25s;}'
  + '#aiw.open .aiw-ov{opacity:1;pointer-events:auto;}'
  + '.aiw-panel{position:fixed;top:0;right:0;height:100%;width:400px;max-width:94vw;background:#fff;z-index:99999;display:flex;flex-direction:column;'
  + 'box-shadow:-24px 0 60px -20px rgba(15,23,42,.4);transform:translateX(104%);transition:transform .32s cubic-bezier(.4,0,.2,1);}'
  + '#aiw.open .aiw-panel{transform:translateX(0);}'
  + '.aiw-head{padding:16px 16px 12px;background:linear-gradient(135deg,var(--ai),var(--ai2));color:#fff;display:flex;align-items:center;justify-content:space-between;}'
  + '.aiw-head-l{display:flex;align-items:center;gap:10px;}'
  + '.aiw-logo{width:34px;height:34px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;}'
  + '.aiw-title{font-weight:700;font-size:15px;letter-spacing:-.01em;}.aiw-sub{font-size:11px;opacity:.85;}'
  + '.aiw-x{background:rgba(255,255,255,.16);border:none;color:#fff;width:30px;height:30px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;}'
  + '.aiw-x:hover{background:rgba(255,255,255,.28);}'
  + '.aiw-tabs{display:flex;gap:4px;padding:8px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;}'
  + '.aiw-tab{flex:1;border:none;background:transparent;padding:8px;border-radius:9px;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;}'
  + '.aiw-tab.is-on{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(15,23,42,.08);}'
  + '.aiw-pill{background:var(--ai);color:#fff;font-size:10px;font-weight:700;min-width:17px;height:17px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;}'
  + '.aiw-pane{flex:1;min-height:0;display:none;flex-direction:column;}.aiw-pane.is-on{display:flex;}'
  + '.aiw-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}'
  + '.aiw-msg{max-width:84%;padding:10px 12px;border-radius:14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;}'
  + '.aiw-msg.bot{background:#fff;border:1px solid #e7ecf2;color:#0f172a;border-bottom-left-radius:5px;align-self:flex-start;}'
  + '.aiw-msg.me{background:linear-gradient(135deg,var(--ai),var(--ai2));color:#fff;border-bottom-right-radius:5px;align-self:flex-end;}'
  + '.aiw-msg.typing{color:#94a3b8;font-style:italic;}'
  + '.aiw-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;background:#f8fafc;}'
  + '.aiw-chip{border:1px solid #d8e0ea;background:#fff;color:#334155;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;line-height:1.2;}'
  + '.aiw-chip:hover{border-color:var(--ai);color:var(--ai);}'
  + '.aiw-input{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e7ecf2;background:#fff;}'
  + '.aiw-input input{flex:1;border:1px solid #d8e0ea;border-radius:12px;padding:10px 12px;font-size:13.5px;outline:none;}'
  + '.aiw-input input:focus{border-color:var(--ai);box-shadow:0 0 0 3px ' + hexA(ACCENT, .14) + ';}'
  + '.aiw-send{border:none;border-radius:12px;width:42px;cursor:pointer;background:linear-gradient(135deg,var(--ai),var(--ai2));display:flex;align-items:center;justify-content:center;}'
  + '.aiw-foot{font-size:10.5px;color:#94a3b8;text-align:center;padding:6px 10px 10px;background:#fff;}'
  + '.aiw-recolist{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}'
  + '.aiw-rc{background:#fff;border:1px solid #e7ecf2;border-radius:14px;padding:12px 13px;}'
  + '.aiw-rc-h{display:flex;align-items:center;gap:9px;margin-bottom:5px;}'
  + '.aiw-rc-ic{width:30px;height:30px;border-radius:9px;background:' + hexA(ACCENT, .12) + ';display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;}'
  + '.aiw-rc-t{font-weight:600;font-size:13.5px;color:#0f172a;flex:1;}'
  + '.aiw-rc-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ai);background:' + hexA(ACCENT, .1) + ';padding:2px 7px;border-radius:999px;}'
  + '.aiw-rc-x{font-size:12.5px;color:#475569;line-height:1.5;}'
  + '.aiw-rc-act{margin-top:9px;display:flex;gap:7px;}'
  + '.aiw-rc-btn{font-size:12px;font-weight:600;border:none;border-radius:9px;padding:6px 11px;cursor:pointer;background:linear-gradient(135deg,var(--ai),var(--ai2));color:#fff;}'
  + '.aiw-rc-btn.ghost{background:#fff;border:1px solid #d8e0ea;color:#475569;}'
  + '@media(max-width:480px){.aiw-panel{width:100vw;}.aiw-fab{right:16px;bottom:16px;}}';

  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- SVG icônes inline ---------- */
  var SP = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9.4l-4.7 1.9L12 16l-1.8-4.7L5.5 9.4l4.7-1.8L12 3z"/><path d="M19 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"/></svg>';
  var SPb = SP.replace(/#fff/g, '#fff');
  var XI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  /* ---------- DOM ---------- */
  var root = document.createElement('div');
  root.id = 'aiw';
  root.innerHTML =
    '<button class="aiw-fab" aria-label="Assistant IA" id="aiw-fab"><span class="aiw-ping"></span>' + SPb +
      (RECO.length ? '<span class="aiw-badge">' + RECO.length + '</span>' : '') + '</button>'
    + '<div class="aiw-ov" id="aiw-ov"></div>'
    + '<aside class="aiw-panel" role="dialog" aria-label="Assistant IA">'
    +   '<div class="aiw-head"><div class="aiw-head-l"><span class="aiw-logo">' + SP + '</span>'
    +     '<div><div class="aiw-title">Assistant IA</div><div class="aiw-sub">' + APP + '</div></div></div>'
    +     '<button class="aiw-x" id="aiw-x">' + XI + '</button></div>'
    +   '<div class="aiw-tabs"><button class="aiw-tab is-on" data-tab="chat">Assistant</button>'
    +     '<button class="aiw-tab" data-tab="reco">Recommandations' + (RECO.length ? ' <span class="aiw-pill">' + RECO.length + '</span>' : '') + '</button></div>'
    +   '<section class="aiw-pane is-on" data-pane="chat">'
    +     '<div class="aiw-msgs" id="aiw-msgs"></div>'
    +     '<div class="aiw-chips" id="aiw-chips"></div>'
    +     '<form class="aiw-input" id="aiw-form"><input id="aiw-text" placeholder="Pose ta question…" autocomplete="off"/><button class="aiw-send" type="submit">' + SEND + '</button></form>'
    +     '<div class="aiw-foot">Maquette — réponses simulées · branchement LLM à venir</div>'
    +   '</section>'
    +   '<section class="aiw-pane" data-pane="reco"><div class="aiw-recolist" id="aiw-recolist"></div></section>'
    + '</aside>';
  document.body.appendChild(root);

  var msgs = root.querySelector('#aiw-msgs');
  var chips = root.querySelector('#aiw-chips');
  var input = root.querySelector('#aiw-text');

  /* ---------- Recommandations ---------- */
  var rl = root.querySelector('#aiw-recolist');
  rl.innerHTML = RECO.map(function (r) {
    return '<div class="aiw-rc"><div class="aiw-rc-h"><span class="aiw-rc-ic">' + (r.icon || '💡') + '</span>'
      + '<span class="aiw-rc-t">' + esc(r.title) + '</span>' + (r.tag ? '<span class="aiw-rc-tag">' + esc(r.tag) + '</span>' : '') + '</div>'
      + '<div class="aiw-rc-x">' + esc(r.text) + '</div>'
      + '<div class="aiw-rc-act"><button class="aiw-rc-btn" data-ask="' + esc(r.title) + '">Demander à l’IA</button>'
      + '<button class="aiw-rc-btn ghost">Ignorer</button></div></div>';
  }).join('') || '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:24px">Aucune recommandation pour le moment.</div>';

  /* ---------- Quick prompts ---------- */
  chips.innerHTML = PROMPTS.map(function (p) { return '<button class="aiw-chip">' + esc(p) + '</button>'; }).join('');

  /* ---------- Logique ---------- */
  function open(tab) { root.classList.add('open'); if (tab) setTab(tab); var b = root.querySelector('.aiw-badge'); if (b) b.style.display = 'none'; setTimeout(function(){ input && input.focus(); }, 350); }
  function close() { root.classList.remove('open'); }
  function setTab(name) {
    root.querySelectorAll('.aiw-tab').forEach(function (t) { t.classList.toggle('is-on', t.dataset.tab === name); });
    root.querySelectorAll('.aiw-pane').forEach(function (p) { p.classList.toggle('is-on', p.dataset.pane === name); });
  }
  function add(text, who) {
    var d = document.createElement('div'); d.className = 'aiw-msg ' + who; d.textContent = text;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }
  function reply(q) {
    var lc = (q || '').toLowerCase();
    var found = REPLIES.find(function (r) { return (r.k || []).some(function (k) { return lc.indexOf(k) !== -1; }); });
    return found ? found.a
      : 'Bonne question. D’après les données de ' + APP + ', voici ce que je te suggère :\n\n• je repère les écarts par rapport à tes objectifs,\n• je te propose 1 à 2 actions concrètes pour améliorer ton projet.\n\nOuvre l’onglet « Recommandations » pour les pistes prioritaires du moment.';
  }
  function send(q) {
    q = (q || input.value || '').trim(); if (!q) return;
    add(q, 'me'); input.value = '';
    var t = add('L’assistant réfléchit…', 'bot typing');
    setTimeout(function () { t.remove(); typeOut(add('', 'bot'), reply(q)); }, 620);
  }
  function typeOut(node, text) {
    var i = 0; node.classList.remove('typing');
    (function tick() {
      node.textContent = text.slice(0, i); msgs.scrollTop = msgs.scrollHeight;
      if (i < text.length) { i += Math.max(2, Math.round(text.length / 90)); setTimeout(tick, 14); }
      else node.textContent = text;
    })();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- Évènements ---------- */
  root.querySelector('#aiw-fab').addEventListener('click', function () { open(); });
  root.querySelector('#aiw-ov').addEventListener('click', close);
  root.querySelector('#aiw-x').addEventListener('click', close);
  root.querySelectorAll('.aiw-tab').forEach(function (t) { t.addEventListener('click', function () { setTab(t.dataset.tab); }); });
  root.querySelector('#aiw-form').addEventListener('submit', function (e) { e.preventDefault(); send(); });
  chips.addEventListener('click', function (e) { var c = e.target.closest('.aiw-chip'); if (c) send(c.textContent); });
  rl.addEventListener('click', function (e) {
    var b = e.target.closest('.aiw-rc-btn'); if (!b) return;
    if (b.dataset.ask != null) { setTab('chat'); send('À propos de : ' + b.dataset.ask + ' — que me recommandes-tu ?'); }
    else { var card = b.closest('.aiw-rc'); if (card) card.style.display = 'none'; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // message d'accueil
  add(GREET, 'bot');

  // API publique (pour ouvrir depuis un bouton « IA » d'une app)
  window.AIW = { open: open, close: close, recommend: function () { open('reco'); }, ask: function (q) { open('chat'); send(q); } };
})();
