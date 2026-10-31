/* NEXORA — nx-player.js · Reproductor multiservidor (Fase 5)
   Contrato (auditoría real, sin inventar nada): reproduce SOLO `server.src` del detalle
   canónico (embed-string || url, normalizado por build-index). iframe cross-origin:
   no se puede leer el tiempo real del vídeo, igual que en DonghuaFlix → progreso por
   marcado (iniciado / visto), nunca por timeupdate. */
'use strict';

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
        <button class="nxp__btn" data-x="full">Pantalla completa</button>
      </div>
      <div class="nxp__stage"><iframe allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="no-referrer"></iframe></div>
      <div class="nxp__dock" data-x="dock"></div>`;
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x;
      if (x === 'close') this.close();
      if (x === 'prev' || x === 'next') this.step(x === 'next' ? 1 : -1);
      if (x === 'seen') this.markSeen();
      if (x === 'full') this.el.requestFullscreen?.().catch(() => {});
      if (x === 'autonext') localStorage.setItem('nx.autonext', b.checked ? '1' : '0');
      if (b.dataset.lang) { this.lang = b.dataset.lang; this.renderDock(); }
      if (b.dataset.srv) this.setServer(+b.dataset.srv);
    });
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
    $('[data-x="epinfo"]', this.el).textContent = `Episodio ${ep.number ?? '?'}`;
    const eps = this.eps(), i = eps.findIndex(e => (e.number ?? e.id) === this.ep);
    $('[data-x="prev"]', this.el).disabled = i <= 0;
    $('[data-x="next"]', this.el).disabled = i < 0 || i >= eps.length - 1;
    this.renderDock();
    if (window.Lib) Lib.saveProgress(this.detail.id, this.ep, null);
  },
  renderDock() {
    const dock = $('[data-x="dock"]', this.el);
    const servers = this.curEp.servers || [];
    const langs = [...new Set(servers.map(s => s.lang || 'sin etiqueta'))];
    const list = servers.filter(s => (s.lang || 'sin etiqueta') === this.lang);
    dock.innerHTML =
      langs.map(l => `<button class="nxp__tab" data-lang="${l}" aria-pressed="${l === this.lang}">${l}</button>`).join('') +
      '<span style="width:8px"></span>' +
      list.map((s, i) => `<button class="nxp__pill" data-srv="${i}" aria-pressed="${i === this.srvIdx}" title="${String(s.src).replace(/"/g,'')}">${String(s.name || 'servidor').replace(/[<>&]/g,'') || 'servidor'}</button>`).join('');
  },
  setServer(i) { this.srvIdx = i; this.iframe().src = this.srvList[i]?.src || 'about:blank'; this.renderDock(); },
  iframe() { return $('iframe', this.el); },
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
