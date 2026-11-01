/* NEXORA — nx-player.js · Reproductor multiservidor (Fase 5)
   Contrato (auditoría real, sin inventar nada): reproduce SOLO `server.src` del detalle
   canónico (embed-string || url, normalizado por build-index). iframe cross-origin:
   no se puede leer el tiempo real del vídeo, igual que en DonghuaFlix → progreso por
   marcado (iniciado / visto), nunca por timeupdate. */
'use strict';

/* helper propio: '$' vive en el módulo nx.js y NO es visible desde este script clásico
   (era el motivo de que el player "no hiciera nada": ReferenceError al abrir). */
const qs = (s, r = document) => r.querySelector(s);

const NXPlayer = {
  el: null, detail: null, ep: null, lang: null,
  styles: `
    .nxp{position:fixed;inset:0;z-index:100;background:rgba(4,4,8,.97);display:flex;flex-direction:column;
         animation:heroIn .25s cubic-bezier(.22,.8,.28,1)}
    .nxp__bar{display:flex;align-items:center;gap:14px;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.09)}
    .nxp__title{font-weight:800;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .nxp__ep{color:#8e8e9c;font-size:13px;font-weight:600;white-space:nowrap}
    .nxp__sp{flex:1}
    .nxp__btn{padding:8px 14px;border-radius:8px;background:rgba(255,255,255,.1);font-size:13px;font-weight:700}
    .nxp__btn:hover{background:rgba(255,255,255,.18)}
    .nxp__btn[disabled]{opacity:.35;pointer-events:none}
    .nxp__stage{flex:1;position:relative;min-height:0;background:#000}
    .nxp__stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
    .nxp__dock{display:flex;align-items:center;gap:10px;padding:10px 18px;border-top:1px solid rgba(255,255,255,.09);
         flex-wrap:wrap}
    .nxp__tab{padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.08);font-size:12px;font-weight:700}
    .nxp__tab[aria-pressed="true"]{background:linear-gradient(110deg,#f20d35,#9d0926);color:#fff}
    .nxp__pill{padding:6px 11px;border-radius:8px;border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:600}
    .nxp__pill[aria-pressed="true"]{border-color:#f20d35;box-shadow:0 0 0 2px rgba(242,13,53,.35)}
    .nxp__chk{display:flex;gap:6px;align-items:center;font-size:12px;color:#c9c9d4;font-weight:600}
    .nxp--cine{background:#000}
    .nxp--cine .nxp__stage{box-shadow:0 0 140px rgba(242,13,53,.14);border:1px solid rgba(255,255,255,.07)}
    .nxp__status{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:10px;
      flex-wrap:wrap;padding:20px;text-align:center;background:rgba(0,0,0,.55);color:#8e8e9c;font-size:13.5px}
  `,
  injectStyles() {
    if (document.getElementById('nxp-styles')) return;
    const s = document.createElement('style');
    s.id = 'nxp-styles'; s.textContent = this.styles;
    document.head.appendChild(s);
  },
  open(detail, epNumber = null) {
    this.injectStyles();
    this.detail = detail;
    const eps = (detail.episodes || []).filter(e => (e.servers || []).length);
    if (!eps.length) { this.toast('Este título no tiene fuentes disponibles todavía.'); return; }
    this.ep = epNumber ?? eps[0].number ?? eps[0].id;
    this.build();
    document.body.appendChild(this.el);
    document.body.style.overflow = 'hidden';
    const cur = eps.find(e => e.number === this.ep) || eps[0];
    this.play(cur);
    document.addEventListener('keydown', this._esc = e => { if (e.key === 'Escape') this.close(); });
  },
  build() {
    const d = this.detail;
    this.el = document.createElement('div');
    this.el.className = 'nxp';
    this.el.innerHTML = `
      <div class="nxp__bar">
        <button class="nxp__btn" data-x="close" title="Cerrar (Esc)">✕</button>
        <span class="nxp__title">${String(d.t || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</span>
        <span class="nxp__ep" data-x="epinfo"></span>
        <span class="nxp__sp"></span>
        <button class="nxp__btn" data-x="prev">‹ Anterior</button>
        <button class="nxp__btn" data-x="next">Siguiente ›</button>
        <button class="nxp__btn" data-x="seen">Marcar visto ✓</button>
        <label class="nxp__chk"><input type="checkbox" data-x="autonext" ${localStorage.getItem('nx.autonext') === '1' ? 'checked' : ''}> autoplay</label>
        <button class="nxp__btn" data-x="cine">Modo cine</button>
        <button class="nxp__btn" data-x="full">Pantalla completa</button>
      </div>
      <div class="nxp__stage">
        <iframe allow="autoplay; fullscreen *; encrypted-media; picture-in-picture" allowfullscreen webkitallowfullscreen mozallowfullscreen loading="lazy"></iframe>
        <div class="nxp__status" data-x="status"><span data-x="statustxt">Conectando con el servidor…</span><button class="nxp__btn" data-x="retry" hidden>Reintentar</button></div>
      </div>
      <div class="nxp__dock" data-x="dock"></div>`;
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x;
      if (x === 'close') this.close();
      if (x === 'prev' || x === 'next') this.step(x === 'next' ? 1 : -1);
      if (x === 'seen') this.markSeen();
      if (x === 'full') this.el.requestFullscreen?.().catch(() => {});
      if (x === 'cine') this.el.classList.toggle('nxp--cine');
      if (x === 'retry') this.retryServer();
      if (x === 'autonext') localStorage.setItem('nx.autonext', b.checked ? '1' : '0');
      if (b.dataset.lang) { this.lang = b.dataset.lang; this.renderDock(); }
      if (b.dataset.srv) this.setServer(+b.dataset.srv);
    });
    // el iframe cross-origin sí dispara 'load' (aunque el contenido esté bloqueado):
    // al cargar, ocultamos el estado; si tarda >12 s, ofrecemos reintento.
    qs('iframe', this.el).addEventListener('load', () => {
      if (this.iframe().src === 'about:blank') return; // carga inicial del documento vacío: no oculta el estado
      clearTimeout(this._to);
      const st = qs('[data-x="status"]', this.el); if (st) st.hidden = true;
    });
  },
  armStatus() {
    clearTimeout(this._to);
    const st = qs('[data-x="status"]', this.el); if (!st) return;
    st.hidden = false;
    qs('[data-x="statustxt"]', st).textContent = 'Conectando con el servidor…';
    qs('[data-x="retry"]', st).hidden = true;
    this._to = setTimeout(() => {
      if (st.hidden) return;
      qs('[data-x="statustxt"]', st).textContent = 'El servidor tarda en responder (puede estar bloqueado en tu red o caído). Prueba otro servidor de la lista o reintenta:';
      qs('[data-x="retry"]', st).hidden = false;
    }, 12000);
  },
  retryServer() {
    const st = qs('[data-x="status"]', this.el); if (st) st.hidden = true;
    this.iframe().src = this.srvList[this.srvIdx]?.src || 'about:blank';
    this.armStatus();
  },
  eps() { return (this.detail.episodes || []).filter(e => (e.servers || []).length).sort((a, b) => (a.number ?? 0) - (b.number ?? 0)); },
  play(ep) {
    this.ep = ep.number ?? ep.id;
    const servers = ep.servers || [];
    const langs = [...new Set(servers.map(s => s.lang || 'sin etiqueta'))];
    if (!this.lang || !langs.includes(this.lang)) this.lang = langs[0];
    const list = servers.filter(s => (s.lang || 'sin etiqueta') === this.lang);
    this.srvIdx = 0; this.srvList = list; this.curEp = ep;
    this.iframe().src = list[0]?.src || 'about:blank';
    this.armStatus();
    qs('[data-x="epinfo"]', this.el).textContent = `Episodio ${ep.number ?? '?'}`;
    const eps = this.eps(), i = eps.findIndex(e => (e.number ?? e.id) === this.ep);
    qs('[data-x="prev"]', this.el).disabled = i <= 0;
    qs('[data-x="next"]', this.el).disabled = i < 0 || i >= eps.length - 1;
    this.renderDock();
    if (window.Lib) Lib.saveProgress(this.detail.id, this.ep, null);
  },
  renderDock() {
    const dock = qs('[data-x="dock"]', this.el);
    const servers = this.curEp.servers || [];
    const langs = [...new Set(servers.map(s => s.lang || 'sin etiqueta'))];
    const list = servers.filter(s => (s.lang || 'sin etiqueta') === this.lang);
    dock.innerHTML =
      langs.map(l => `<button class="nxp__tab" data-lang="${l}" aria-pressed="${l === this.lang}">${l}</button>`).join('') +
      '<span style="width:8px"></span>' +
      list.map((s, i) => `<button class="nxp__pill" data-srv="${i}" aria-pressed="${i === this.srvIdx}" title="${String(s.src).replace(/"/g,'')}">${String(s.name || 'servidor').replace(/[<>&]/g,'') || 'servidor'}</button>`).join('');
  },
  setServer(i) { this.srvIdx = i; this.iframe().src = this.srvList[i]?.src || 'about:blank'; this.armStatus(); this.renderDock(); },
  iframe() { return qs('iframe', this.el); },
  step(d) {
    const eps = this.eps(), i = eps.findIndex(e => (e.number ?? e.id) === this.ep);
    const n = eps[i + d]; if (n) this.play(n);
  },
  markSeen() {
    if (window.Lib) Lib.saveProgress(this.detail.id, this.ep, 100);
    this.toast(`Episodio ${this.ep} marcado como visto`);
    if (localStorage.getItem('nx.autonext') === '1') this.step(1);
    else if (window.route) route(); // refresca "Continuar viendo"
  },
  close() {
    this.iframe().src = 'about:blank';
    this.el.remove(); document.body.style.overflow = '';
    document.removeEventListener('keydown', this._esc);
    if (window.route) route();
  },
  toast(m) { const t = document.createElement('div'); t.className = 'nx-statusbar nx-on'; t.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:200;padding:10px 20px;border-radius:10px;background:#1c1c26;border:1px solid rgba(255,255,255,.16);font-size:13px;font-weight:600'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); },
};
window.NXPlayer = NXPlayer;
