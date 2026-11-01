/* NEXORA v2 — Motor completo en UN solo archivo (script clásico, sin módulos).
   Catálogo canónico nx-* · Reproductor multiservidor con lista de episodios (lógica DonghuaFlix:
   iframe de `url`, sin referrerpolicy) · Biblioteca · IA · PWA · Todo en el mismo ámbito. */
'use strict';

/* ---------- utilidades ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byU = (a, b) => new Date(b.u || 0) - new Date(a.u || 0);
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' }); };
const dName = id => id.replace(/[:|]/g, '_');
function toast(msg) { const el = $('#statusBar'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 2400); }

/* ---------- etiquetas ---------- */
const L_TY  = { movie:'Película', series:'Serie' };
const L_MD  = { animation:'Animación', live:'Acción real', unconfirmed:'Medio sin confirmar' };
const L_CAT = { anime:'Anime', donghua:'Donghua', dorama:'Dorama', 'western-animation':'Animación occidental', 'live-series':'Serie de acción real', movie:'Película', other:'Otro', unconfirmed:'Sin clasificar' };
const L_ST  = { airing:'En emisión', finished:'Finalizado', upcoming:'Próximamente', gone:'Retirado', unconfirmed:'Sin confirmar' };
const L_GEN = { accion:'Acción', aventura:'Aventura', romance:'Romance', fantasia:'Fantasía', 'ciencia-ficcion':'Ciencia ficción', terror:'Terror', comedia:'Comedia', misterio:'Misterio', drama:'Drama', suspenso:'Suspense', deportes:'Deportes', historico:'Histórico', escolar:'Escolar', 'artes-marciales':'Artes marciales', supervivencia:'Supervivencia', animacion:'Animación', musica:'Música', cultivo:'Cultivo', xianxia:'Xianxia', wuxia:'Wuxia', dioses:'Dioses', mitologia:'Mitología', militar:'Militar', demonios:'Demonios' };

/* ---------- iconos SVG ---------- */
const I = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'),
  compass: I('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  spark: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  film: I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  tv: I('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 3 4 3 4-3"/>'),
  dragon: I('<path d="M4 17c4-1 5-5 4-9 3 1 5 4 4 8 2-1 3-3 3-6 3 3 4 8-2 10H6c-2 0-2-2-2-3z"/><path d="M9 20c2 1 6 1 8-1"/>'),
  drama: I('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>'),
  play: I('<path d="M7 4.5v15l12-7.5z"/>'),
  library: I('<path d="M4 4v16M9 4v16M14 5l4 15"/><path d="M4 20h16"/>'),
  ai: I('<path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z"/>'),
  heart: I('<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>'),
  heartF: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/></svg>',
  check: I('<path d="m4 12.5 5 5L20 6.5"/>'),
  back: I('<path d="m14 6-6 6 6 6"/>'),
  next: I('<path d="m10 6 6 6-6 6"/>'),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  full: I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  cine: I('<path d="M4 5h16v14H4z"/><path d="m4 5 2.5 3L9 5l2.5 3L14 5l2.5 3L19 5M4 19l2.5-3M9 19l2.5-3M14 19l2.5-3M19 19l-2.5-3"/>'),
};

/* ---------- navegación ---------- */
const SECTIONS = [
  { path:'/',           label:'Inicio',       icon:'home',    view:'home' },
  { path:'/explorar',   label:'Explorar',     icon:'compass', view:'explore' },
  { path:'/generos',    label:'Géneros',      icon:'spark',   view:'genres' },
  { path:'/novedades',  label:'Novedades',    icon:'clock',   view:'news' },
  { path:'/peliculas',  label:'Películas',    icon:'film',    view:'cat', cat:'movie' },
  { path:'/series',     label:'Series',       icon:'tv',      view:'cat', ty:'series' },
  { path:'/anime',      label:'Anime',        icon:'spark',   view:'cat', cat:'anime' },
  { path:'/donghua',    label:'Donghua',      icon:'dragon',  view:'cat', cat:'donghua' },
  { path:'/doramas',    label:'Doramas',      icon:'drama',   view:'cat', cat:'dorama' },
  { path:'/animacion',  label:'Animación',    icon:'tv',      view:'cat', cat:'_anim' },
  { path:'/biblioteca', label:'Mi biblioteca',icon:'library', view:'library' },
  { path:'/ia',         label:'Asistente IA', icon:'ai',      view:'ia' },
  { path:'/ajustes',    label:'Ajustes',      icon:'settings',view:'settings', sideEnd:true },
];
function renderNav() {
  $('#topNav').innerHTML = SECTIONS.slice(0, 10).map(s => `<a href="#${s.path}" data-path="${s.path}">${s.label}</a>`).join('');
  $('#sidebar').innerHTML = SECTIONS.map(s => `<a class="nx-sideitem ${s.sideEnd ? 'nx-sideitem--end' : ''}" href="#${s.path}" data-path="${s.path}">${IC[s.icon]}<span>${s.label.split(' ')[0]}</span></a>`).join('');
  $('#bottomNav').innerHTML = [SECTIONS[0], SECTIONS[1], SECTIONS[2], SECTIONS[10], SECTIONS[12]].map(s => `<a href="#${s.path}" data-path="${s.path}">${IC[s.icon]}<span>${s.label.split(' ')[0]}</span></a>`).join('');
}
const markCurrent = path => $$('[data-path]').forEach(a => a.classList.toggle('on', a.getAttribute('data-path') === path));

/* ---------- catálogo (nx-*) ---------- */
const Catalog = {
  mode:null, manifest:null, items:[], _p:null, _details:null, _buckets:null,
  load() { // single-flight
    if (this.items.length) return Promise.resolve(this.items);
    this._p ||= this._doLoad();
    return this._p;
  },
  async _doLoad() {
    try {
      const man = await (await fetch('public/data/nx-manifest.json')).json();
      const first = await (await fetch('public/data/nx-index-00.json')).json();
      const of = first.meta?.of || 1;
      const items = [...first.items];
      for (let s = 1; s < of; s++) items.push(...(await (await fetch(`public/data/nx-index-${String(s).padStart(2,'0')}.json`)).json()).items);
      this.mode = 'canonical'; this.manifest = man; this.items = items.filter(i => i.st !== 'gone');
      return this.items;
    } catch {
      const res = await fetch('data/catalog.donghuasub.json');
      if (!res.ok) throw new Error('No se pudo cargar el catálogo (' + res.status + ')');
      const raw = await res.json();
      this.mode = 'demo';
      this.items = raw.series.map(e => ({ id:'nx:slug:'+e.i, t:e.t, ty:'series', md:'animation', cat:e.ty || 'unconfirmed',
        g:[], c:[], y:null, st:'unconfirmed', e:null, p:e.p, u:e.u, src:1 }))
        .filter(i => i.t && i.t.trim().length >= 2 && i.t.trim() !== '404');
      return this.items;
    }
  },
  async detail(id) {
    if (this.mode !== 'canonical') { const it = this.items.find(i => i.id === id); return it ? { ...it, src:[] } : null; }
    this._details ||= new Map();
    if (this._details.has(id)) return this._details.get(id);
    let d = null;
    if (this.manifest?.detailsMode === 'buckets') {
      this._buckets ||= new Map();
      const key = dName(id).replace(/^nx_(hash|tmdb)_/, '').slice(0, 2) || 'zz';
      if (!this._buckets.has(key)) {
        try { this._buckets.set(key, (await (await fetch(`public/data/nx-details-b-${key}.json`)).json()).items); }
        catch { this._buckets.set(key, {}); }
      }
      d = this._buckets.get(key)[id] || null;
    } else {
      try { d = await (await fetch(`public/data/nx-details/${dName(id)}.json`)).json(); } catch { d = null; }
    }
    this._details.set(id, d); return d;
  },
  counts() { return this.manifest?.conteos || null; },
  search(q) { q = q.trim().toLowerCase(); if (!q) return [];
    return this.items.filter(i => (i.t + ' ' + (i.alt || []).join(' ') + ' ' + (i.g || []).map(g => L_GEN[g] || g).join(' ')).toLowerCase().includes(q)).sort(byU); },
  genresOf(list) { const m = new Map(); for (const i of list) for (const g of i.g || []) m.set(g, (m.get(g) || 0) + 1); return [...m.entries()].sort((a,b) => b[1]-a[1]); },
};

/* ---------- biblioteca local ---------- */
const Lib = {
  key: 'nx.lib.v1',
  read()  { try { return JSON.parse(localStorage.getItem(this.key)) || { favs:{}, progress:{}, history:{} }; } catch { return { favs:{}, progress:{}, history:{} }; } },
  write(d){ localStorage.setItem(this.key, JSON.stringify(d)); if (window.NXSync) NXSync.push(); },
  toggleFav(id) { const d = this.read(); d.favs[id] ? delete d.favs[id] : d.favs[id] = Date.now(); this.write(d); return !!d.favs[id]; },
  isFav(id)     { return !!this.read().favs[id]; },
  favs()        { const d = this.read(); return Catalog.items.filter(i => d.favs[i.id]); },
  saveProgress(id, ep, pct) { const d = this.read(); d.progress[id] = { ep, pct, ts: Date.now() }; d.history[id] = { ep, ts: Date.now() }; this.write(d); },
  progress(id)  { return this.read().progress[id] || null; },
  watched(id, ep) { const p = this.read().progress[id]; return !!p && p.ep === ep && p.pct === 100; },
  continueList(){ const d = this.read(); return Object.entries(d.progress).map(([id, p]) => ({ item: Catalog.items.find(i => i.id === id), p })).filter(x => x.item).sort((a,b) => b.p.ts - a.p.ts); },
  historyList() { const d = this.read(); return Object.entries(d.history).map(([id, h]) => ({ item: Catalog.items.find(i => i.id === id), h })).filter(x => x.item).sort((a,b) => b.h.ts - a.h.ts); },
};

/* ---------- lazy-load de imágenes (nunca oculta una cargada) ---------- */
const imgObs = new IntersectionObserver(es => {
  for (const en of es) {
    const img = en.target;
    if (!en.isIntersecting || img.dataset.ok) continue;
    imgObs.unobserve(img);
    const n = +(img.dataset.retries || 0);
    if (n >= 2) continue;
    img.dataset.retries = n + 1;
    img.src = img.dataset.src;
  }
}, { rootMargin: '300px' });
function armImg(img) {
  img.decoding = 'async';
  img.addEventListener('load', () => { img.dataset.ok = '1'; img.classList.add('ok'); });
  img.addEventListener('error', () => {
    if (img.dataset.ok) return;
    const n = +(img.dataset.retries || 0);
    if (n < 2) setTimeout(() => { if (!img.dataset.ok && img.isConnected) img.src = img.dataset.src; }, 1200 * (n + 1));
  });
  imgObs.observe(img);
}

/* ---------- componentes UI ---------- */
const metaLine = it => { const b = []; if (it.y) b.push(String(it.y)); b.push(L_ST[it.st] || 'Sin confirmar'); if (it.e) b.push(it.e + (it.ty === 'movie' ? '' : ' ep.')); return b.join(' · '); };

function card(item, prog) {
  const a = document.createElement('a');
  a.className = 'nx-card'; a.href = `#/titulo/${encodeURIComponent(item.id)}`; a.setAttribute('aria-label', item.t);
  a.innerHTML = `
    <div class="nx-card__poster">
      <div class="nx-card__fb">${esc((item.t || '?').trim().charAt(0).toUpperCase())}</div>
      ${item.p ? `<img data-src="${esc(item.p)}" alt="" loading="lazy">` : ''}
    </div>
    <div class="nx-card__body">
      <h3 class="nx-card__title">${esc(item.t)}</h3>
      <div class="nx-card__meta"><span class="nx-card__tag">${esc(L_CAT[item.cat] || 'Sin clasificar')}</span><span>${esc(metaLine(item))}</span></div>
    </div>
    ${prog != null ? `<div class="nx-card__prog"><i style="width:${prog}%"></i></div>` : ''}`;
  const img = a.querySelector('img');
  if (img) armImg(img);
  return a;
}
function row(title, items, { hint = '', more = null } = {}) {
  const sec = document.createElement('section'); sec.className = 'nx-row';
  sec.innerHTML = `<div class="nx-row__head"><h2 class="nx-row__title">${esc(title)}</h2>
    ${hint ? `<span class="nx-row__hint">${esc(hint)}</span>` : ''}
    ${more ? `<a class="nx-row__more" href="${more}">Ver todo</a>` : ''}</div><div class="nx-row__track"></div>`;
  const track = $('.nx-row__track', sec);
  if (!items.length) { sec.querySelector('.nx-row__head').insertAdjacentHTML('afterend', '<div class="nx-empty" style="padding:14px var(--pad)">Sin contenido todavía.</div>'); return sec; }
  const frag = document.createDocumentFragment();
  items.forEach(i => frag.appendChild(card(i)));
  track.appendChild(frag);
  return sec;
}
function hero(item) {
  const el = document.createElement('section'); el.className = 'nx-hero';
  el.innerHTML = `<div class="nx-hero__content">
    <span class="nx-hero__badge">${esc(L_CAT[item.cat] || 'Destacado')}</span>
    <h1 class="nx-hero__title">${esc(item.t)}</h1>
    <div class="nx-hero__meta"><span class="ok">NEXORA</span><span>${esc(L_TY[item.ty] || '')}</span><span>${esc(metaLine(item))}</span></div>
    <p class="nx-hero__syn">Ficha con temporadas, episodios y fuentes disponibles.</p>
    <div class="nx-hero__actions">
      <a class="nx-btn nx-btn--pri" href="#/titulo/${encodeURIComponent(item.id)}">${IC.play} Ver ficha</a>
      <button class="nx-btn nx-btn--gho" data-fav="${esc(item.id)}">${Lib.isFav(item.id) ? IC.heartF : IC.heart} Mi lista</button>
    </div></div>`;
  bindFav(el);
  return el;
}
function bindFav(root) {
  $$('[data-fav]', root).forEach(btn => btn.addEventListener('click', () => {
    const added = Lib.toggleFav(btn.dataset.fav);
    btn.innerHTML = (added ? IC.heartF : IC.heart) + ' Mi lista';
    toast(added ? 'Añadido a Mi lista' : 'Quitado de Mi lista');
  }));
}
/* rejilla paginada incremental: "Cargar más" añade bloques sin reconstruir */
function fillGrid(grid, list, emptyMsg) {
  grid.replaceChildren();
  if (!list.length) { grid.innerHTML = `<div class="nx-empty" style="grid-column:1/-1">${emptyMsg}</div>`; return; }
  let rendered = 0;
  const renderMore = () => {
    const target = Math.min(rendered + 240, list.length);
    const frag = document.createDocumentFragment();
    for (; rendered < target; rendered++) frag.appendChild(card(list[rendered]));
    const oldBtn = grid.querySelector('[data-more]'); if (oldBtn) oldBtn.remove();
    grid.appendChild(frag);
    if (rendered < list.length) {
      const more = document.createElement('button');
      more.className = 'nx-chip'; more.dataset.more = '1'; more.style.gridColumn = '1/-1';
      more.textContent = `Cargar más (${list.length - rendered} restantes)`;
      more.addEventListener('click', renderMore);
      grid.appendChild(more);
    }
  };
  renderMore();
}

/* ---------- vistas ---------- */
const Views = {
  async home(view) {
    const items = await Catalog.load();
    const latest = [...items].sort(byU);
    if (latest.length) view.appendChild(hero(latest[0]));
    const rows = document.createElement('div'); rows.className = 'nx-rows';
    const cont = Lib.continueList();
    if (cont.length) {
      const sec = row('Continuar viendo', [], {});
      const track = $('.nx-row__track', sec);
      cont.forEach(({ item, p }) => track.appendChild(card(item, p.pct ?? 10)));
      rows.appendChild(sec);
    }
    rows.appendChild(row('Tendencias', latest.slice(0, 12), { hint: 'actualizaciones', more: '#/explorar' }));
    rows.appendChild(row('Lo más nuevo', latest.slice(12, 26)));
    const estrenos = items.filter(i => i.y).sort((a, b) => b.y - a.y).slice(0, 14);
    if (estrenos.length) rows.appendChild(row('Estrenos recientes', estrenos, { hint: 'por año de estreno' }));
    rows.appendChild(row('Películas', items.filter(i => i.ty === 'movie').slice(0, 18), { more: '#/peliculas' }));
    rows.appendChild(row('Anime', items.filter(i => i.cat === 'anime').slice(0, 18), { more: '#/anime' }));
    rows.appendChild(row('Donghua', items.filter(i => i.cat === 'donghua').slice(0, 18), { more: '#/donghua' }));
    rows.appendChild(row('Doramas', items.filter(i => i.cat === 'dorama').slice(0, 18), { more: '#/doramas' }));
    rows.appendChild(row('Series de acción real', items.filter(i => i.cat === 'live-series').slice(0, 18), { more: '#/series' }));
    view.appendChild(rows);
    const c = Catalog.counts();
    const note = document.createElement('p'); note.className = 'nx-empty';
    note.textContent = c
      ? `Catálogo central: ${c.canonicos_unicos} títulos únicos (${c.records_originales} registros de ${Object.keys(c.aceptados_por_fuente || {}).length} fuentes).`
      : `Modo demo: ${items.length} títulos.`;
    view.appendChild(note);
  },

  async cat(view, sec) {
    const items = await Catalog.load();
    let list;
    if (sec.cat === '_anim') list = items.filter(i => ['anime','donghua','western-animation'].includes(i.cat));
    else if (sec.ty)      list = items.filter(i => i.ty === sec.ty);
    else                  list = items.filter(i => i.cat === sec.cat);
    const title = sec.cat === '_anim' ? 'Animación' : sec.label;
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>${esc(title)}</h1><p>${list.length} títulos</p></div>`);
    const chips = document.createElement('div'); chips.className = 'nx-filters';
    chips.innerHTML = `<button class="nx-chip on" data-mode="rec">Recientes</button>
      <button class="nx-chip" data-mode="az">A–Z</button>
      <button class="nx-chip" data-mode="air">En emisión</button>
      <button class="nx-chip" data-mode="fin">Finalizados</button>
      <span style="flex-basis:100%"></span>` +
      Catalog.genresOf(list).slice(0, 10).map(([g]) => `<button class="nx-chip" data-genre="${esc(g)}">${esc(L_GEN[g] || g)}</button>`).join('');
    view.appendChild(chips);
    const grid = document.createElement('div'); grid.className = 'nx-grid'; view.appendChild(grid);
    let genre = null;
    const draw = mode => {
      let l = genre ? list.filter(i => (i.g || []).includes(genre)) : [...list];
      if (mode === 'air') l = l.filter(i => i.st === 'airing');
      if (mode === 'fin') l = l.filter(i => i.st === 'finished');
      if (mode === 'az') l.sort((a, b) => a.t.localeCompare(b.t)); else l.sort(byU);
      fillGrid(grid, l, 'Sin resultados con estos filtros.');
    };
    chips.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.genre) { genre = genre === b.dataset.genre ? null : b.dataset.genre;
        $$('[data-genre]', chips).forEach(c => c.classList.toggle('on', c.dataset.genre === genre)); }
      else $$('[data-mode]', chips).forEach(c => c.classList.toggle('on', c === b));
      draw($('[data-mode].on', chips)?.dataset.mode || 'rec');
    });
    draw('rec');
  },

  async explore(view) {
    const items = await Catalog.load();
    const c = Catalog.counts();
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Explorar</h1><p>${c ? c.canonicos_unicos + ' títulos únicos canónicos.' : items.length + ' títulos.'} Filtros combinables.</p></div>`);
    const chips = document.createElement('div'); chips.className = 'nx-filters';
    const cats = [...new Set(items.map(i => i.cat))];
    chips.innerHTML = `<button class="nx-chip" data-f="ty:movie">Películas</button><button class="nx-chip" data-f="ty:series">Series</button>` +
      cats.map(x => `<button class="nx-chip" data-f="cat:${x}">${esc(L_CAT[x] || x)}</button>`).join('') +
      `<span style="flex-basis:100%"></span>` +
      Catalog.genresOf(items).slice(0, 12).map(([g]) => `<button class="nx-chip" data-f="g:${esc(g)}">${esc(L_GEN[g] || g)}</button>`).join('') +
      `<span style="flex-basis:100%"></span>
       <button class="nx-chip" data-f="st:airing">En emisión</button><button class="nx-chip" data-f="st:finished">Finalizados</button>`;
    view.appendChild(chips);
    const grid = document.createElement('div'); grid.className = 'nx-grid'; view.appendChild(grid);
    const active = new Set();
    const draw = () => {
      const l = items.filter(i => {
        for (const f of active) { const [k, v] = f.split(':');
          if (k === 'ty' && i.ty !== v) return false;
          if (k === 'cat' && i.cat !== v) return false;
          if (k === 'g' && !(i.g || []).includes(v)) return false;
          if (k === 'st' && i.st !== v) return false; }
        return true;
      }).sort(byU);
      fillGrid(grid, l, 'Sin resultados. Quita algún filtro.');
    };
    chips.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return;
      const f = b.dataset.f; active.has(f) ? active.delete(f) : active.add(f);
      b.classList.toggle('on', active.has(f)); draw(); });
    draw();
  },

  async genres(view) {
    const items = await Catalog.load();
    const counts = Catalog.genresOf(items);
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Géneros</h1><p>${counts.length} géneros con contenido. Toca uno para explorarlo.</p></div>
      <div class="nx-filters">${counts.map(([g, n]) => `<a class="nx-chip" href="#/genero/${encodeURIComponent(g)}">${esc(L_GEN[g] || g)} · ${n}</a>`).join('')}</div>
      ${counts.length ? '' : '<div class="nx-empty">Los géneros aparecen con el enriquecimiento (dfx-genres).</div>'}`);
  },

  async genre(view, { g }) {
    const items = await Catalog.load();
    const list = items.filter(i => (i.g || []).includes(g)).sort(byU);
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>${esc(L_GEN[g] || g)}</h1><p>${list.length} títulos</p></div>`);
    const grid = document.createElement('div'); grid.className = 'nx-grid';
    fillGrid(grid, list, 'Sin títulos en este género todavía.');
    view.appendChild(grid);
  },

  async news(view) {
    const items = await Catalog.load();
    const now = Date.now(), d7 = now - 7 * 864e5, d30 = now - 30 * 864e5;
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Novedades</h1><p>Cronología por fechas verificadas: actualización/incorporación ≠ estreno.</p></div>`);
    const rows = document.createElement('div'); rows.className = 'nx-rows';
    const w7 = items.filter(i => new Date(i.u || 0).getTime() >= d7).sort(byU);
    const w30 = items.filter(i => { const t = new Date(i.u || 0).getTime(); return t >= d30 && t < d7; }).sort(byU);
    if (w7.length) rows.appendChild(row('Actualizados esta semana', w7.slice(0, 24)));
    if (w30.length) rows.appendChild(row('Últimos 30 días', w30.slice(0, 24)));
    for (const y of [2026, 2025, 2024]) {
      const l = items.filter(i => i.y === y).sort(byU).slice(0, 18);
      if (l.length) rows.appendChild(row(`Estrenos ${y}`, l, { hint: 'por año de estreno' }));
    }
    view.appendChild(rows);
  },

  async search(view, { q }) {
    const r = Catalog.search(q);
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Resultados para “${esc(q)}”</h1><p>${r.length} coincidencias.</p></div>`);
    const grid = document.createElement('div'); grid.className = 'nx-grid';
    fillGrid(grid, r, 'Sin coincidencias.');
    view.appendChild(grid);
  },

  /* ---------- ficha + reproductor ---------- */
  async title(view, { id }) {
    const it = Catalog.items.find(i => i.id === id);
    if (!it) { view.innerHTML = '<div class="nx-empty">Título no encontrado.</div>'; return; }
    const det = await Catalog.detail(id);
    const fav = Lib.isFav(id), prog = Lib.progress(id);
    const eps = det?.episodes || [], seas = det?.seasons || [];
    const playable = eps.filter(e => (e.servers || []).length).length;
    const related = Catalog.items.filter(x => x.id !== id && (x.cat === it.cat || (x.g || []).some(g => (it.g || []).includes(g)))).sort(byU).slice(0, 14);
    view.insertAdjacentHTML('beforeend', `
    <section class="nx-title-hero"><div class="nx-title-grid">
      <div class="nx-title-poster">${it.p ? `<img src="${esc(it.p)}" alt="Póster de ${esc(it.t)}">` : `<div class="nx-card__fb" style="font-size:64px">${esc(it.t.charAt(0))}</div>`}</div>
      <div class="nx-title-info">
        <span class="nx-hero__badge">${esc(L_CAT[it.cat] || 'Sin clasificar')}</span>
        <h1>${esc(it.t)}</h1>
        <div class="nx-hero__meta"><span class="ok">${esc(L_TY[it.ty] || '')}</span><span>${esc(L_MD[it.md] || '')}</span>
          <span>${esc(metaLine(it))}</span>${(it.c || []).length ? `<span>${esc(it.c.join(' · '))}</span>` : ''}</div>
        <p>${det?.d?.syn ? esc(det.d.syn) : 'Sinopsis no disponible en las fuentes (sin confirmar).'}</p>
        <div class="nx-hero__actions">
          ${playable ? `<button class="nx-btn nx-btn--acc" data-play>${IC.play} ${prog ? `Continuar (ep. ${prog.ep})` : 'Reproducir'}</button>` : `<button class="nx-btn nx-btn--acc" disabled>${IC.play} Reproducir</button>`}
          <button class="nx-btn nx-btn--gho" data-fav="${esc(id)}">${fav ? IC.heartF : IC.heart} Mi lista</button>
        </div>
      </div>
    </div></section>
    <div class="nx-detailbody">
      <dl class="nx-kv">
        <div><dt>Identificador canónico</dt><dd>${esc(it.id)}</dd></div>
        <div><dt>Géneros</dt><dd>${it.g?.length ? esc(it.g.map(g => L_GEN[g] || g).join(', ')) : 'Sin confirmar'}</dd></div>
        <div><dt>País</dt><dd>${it.c?.length ? esc(it.c.join(', ')) : 'Sin confirmar'}</dd></div>
        <div><dt>Estado</dt><dd>${esc(L_ST[it.st] || 'Sin confirmar')}</dd></div>
        <div><dt>Estreno</dt><dd>${it.y || 'Sin confirmar'}</dd></div>
        <div><dt>Episodios</dt><dd>${it.e ?? (eps.length || 'Sin confirmar')}</dd></div>
        <div><dt>Fuentes</dt><dd>${det?.src?.length ? esc(det.src.map(s => s.tag).join(', ')) : '—'}</dd></div>
        <div><dt>Actualizado</dt><dd>${fmtDate(it.u)}</dd></div>
      </dl>
      ${seas.length ? `<h2 class="nx-row__title" style="margin:0 0 10px">Temporadas</h2>
      <div class="nx-filters" style="padding:0 0 14px">${seas.map(s => `<span class="nx-chip">T${s.number ?? '?'} · ${s.episodes ?? '?'} episodios</span>`).join('')}</div>` : ''}
      ${eps.length ? `<h2 class="nx-row__title" style="margin:0 0 10px">Episodios (${eps.length})</h2>` : ''}
    </div>`);
    bindFav(view);
    $('[data-play]', view)?.addEventListener('click', () => Player.open(det, prog?.ep ?? null));
    if (related.length) view.appendChild(row('Contenido relacionado', related));
  },

  async library(view) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Mi biblioteca</h1><p>Favoritos, progreso e historial en este dispositivo.</p></div>`);
    view.appendChild(row('Mi lista', Lib.favs()));
    const cont = Lib.continueList();
    if (cont.length) {
      const sec = row('Continuar viendo', [], {});
      const track = $('.nx-row__track', sec);
      cont.forEach(({ item, p }) => track.appendChild(card(item, p.pct ?? 10)));
      view.appendChild(sec);
    }
    view.appendChild(row('Historial', Lib.historyList().map(x => x.item)));
  },

  async ia(view) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Asistente IA</h1>
      <p>Recomendaciones solo del catálogo real. Configura GEMINI_API_KEY o GROQ_API_KEY como secreto de Pages.</p></div>
      <div class="nx-filters" style="flex-direction:column;align-items:stretch;gap:10px" id="chat">
        <div data-msgs style="max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div>
        <form data-form style="display:flex;gap:8px">
          <input data-q placeholder="Quiero algo de fantasía con romance y protagonista poderoso…" style="flex:1;padding:11px 14px;border-radius:10px;border:1px solid var(--line2);background:var(--e2);color:var(--tx)">
          <button class="nx-btn nx-btn--acc" type="submit">Enviar</button>
        </form>
      </div><div id="ia-results" style="padding:0 var(--pad)"></div>`);
    const box = $('[data-msgs]', view);
    const addMsg = (txt, me) => box.insertAdjacentHTML('beforeend',
      `<div style="align-self:${me ? 'flex-end' : 'flex-start'};max-width:82%;padding:9px 13px;border-radius:12px;background:${me ? 'linear-gradient(110deg,var(--red),var(--red2))' : 'var(--e2)'};font-size:13.5px">${esc(txt)}</div>`);
    $('[data-form]', view).addEventListener('submit', async e => {
      e.preventDefault();
      const q = $('[data-q]', view).value.trim(); if (!q) return;
      addMsg(q, true); $('[data-q]', view).value = '';
      addMsg('Buscando en el catálogo…', false);
      try {
        const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
        const d = await r.json();
        box.lastElementChild.remove();
        if (d.error) { addMsg(d.error, false); return; }
        if (d.reply) addMsg(d.reply, false);
        if (d.picks?.length) {
          const res = $('#ia-results'); res.replaceChildren();
          res.appendChild(row('Recomendado para ti', d.picks.map(p => Catalog.items.find(i => i.id === p.id)).filter(Boolean)));
        }
      } catch { box.lastElementChild.remove(); addMsg('No se pudo contactar con el asistente.', false); }
    });
  },

  async settings(view) {
    const c = Catalog.counts();
    let rep = null;
    try { rep = await (await fetch('public/data/nx-report.json')).json(); } catch {}
    const srcRows = rep ? Object.entries(rep.sources || {}).map(([tag, s]) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid var(--line)">${esc(tag)}</td>
       <td style="padding:6px 10px;border-bottom:1px solid var(--line)">${esc(s.estado || '—')}${s.reasons?.length ? `<div style="color:var(--tx3);font-size:11px">${esc(s.reasons.join(' · '))}</div>` : ''}</td>
       <td style="padding:6px 10px;border-bottom:1px solid var(--line)">${s.actual ?? '—'}</td></tr>`).join('') : '';
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Ajustes</h1><p>Estado del catálogo y preferencias.</p></div>
    <div class="nx-detailbody" style="padding-top:0">
      <h2 class="nx-row__title" style="margin:0 0 10px">Catálogo</h2>
      <dl class="nx-kv">
        <div><dt>Modo</dt><dd>${Catalog.mode === 'canonical' ? 'Canónico (nx-*)' : 'Demo'}</dd></div>
        <div><dt>Títulos únicos</dt><dd>${c ? c.canonicos_unicos : Catalog.items.length}</dd></div>
        <div><dt>Registros de fuente</dt><dd>${c ? c.records_originales : '—'}</dd></div>
        <div><dt>Pendientes de revisión</dt><dd>${c ? c.pendientes_revision : '—'}</dd></div>
        <div><dt>Importado</dt><dd>${rep ? fmtDate(rep.generatedAt) : '—'}</dd></div>
      </dl>
      ${srcRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">${srcRows}</table>` : ''}
      <h2 class="nx-row__title" style="margin:0 0 10px">Reproducción</h2>
      <div class="nx-filters" style="padding:0 0 20px">
        <button class="nx-chip" id="setAutonext">Autoplay siguiente episodio</button>
      </div>
      <h2 class="nx-row__title" style="margin:0 0 10px">Aplicación</h2>
      <div class="nx-filters" style="padding:0">
        <button class="nx-chip" id="setInstall">Instalar app (PWA)</button>
        <button class="nx-chip" id="setClear">Borrar datos locales</button>
      </div>
      <p class="nx-empty" style="text-align:left;padding:18px 0">Los datos (favoritos, progreso) viven en este dispositivo. La sincronización entre dispositivos se activa al configurar Firebase (ver documentación del proyecto).</p>
    </div>`);
    const auto = $('#setAutonext', view);
    auto.classList.toggle('on', localStorage.getItem('nx.autonext') === '1');
    auto.addEventListener('click', () => {
      const on = localStorage.getItem('nx.autonext') === '1';
      localStorage.setItem('nx.autonext', on ? '0' : '1');
      auto.classList.toggle('on', !on);
    });
    $('#setClear', view).addEventListener('click', () => {
      if (confirm('¿Borrar favoritos, progreso e historial de este dispositivo?')) { localStorage.removeItem(Lib.key); toast('Datos borrados'); route(); }
    });
    let deferred = null;
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; }, { once: true });
    $('#setInstall', view).addEventListener('click', async () => {
      if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; }
      else toast('Usa el menú del navegador → "Añadir a pantalla de inicio".');
    });
  },
};

/* ================= REPRODUCTOR (mismo archivo, lógica DonghuaFlix) =================
   iframe src = server.url (no embed); sin referrerpolicy. Lista de episodios integrada,
   pestañas por idioma, píldoras por servidor, siguiente/anterior, marcar visto, autoplay,
   modo cine, pantalla completa. Progreso por marcado (iframe cross-origin). */
const Player = {
  el: null, detail: null, curEp: null, lang: null, srvIdx: 0, srvList: [],
  open(detail, epNumber = null) {
    const eps = (detail.episodes || []).filter(e => (e.servers || []).length);
    if (!eps.length) { toast('Este título no tiene fuentes disponibles todavía.'); return; }
    this.detail = detail;
    this.ep = epNumber ?? eps[0].number ?? null;
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
        <button class="nxp__btn" data-x="close" title="Cerrar (Esc)">${IC.close}</button>
        <span class="nxp__title">${esc(d.t || '')}</span>
        <span class="nxp__ep" data-x="epinfo"></span>
        <span class="nxp__sp"></span>
        <button class="nxp__btn" data-x="autonext" title="Autoplay">${IC.next} autoplay</button>
        <button class="nxp__btn" data-x="cine" title="Modo cine">${IC.cine}</button>
        <button class="nxp__btn" data-x="full" title="Pantalla completa">${IC.full}</button>
      </div>
      <div class="nxp__stage">
        <iframe allow="autoplay; fullscreen *; encrypted-media; picture-in-picture" allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>
        <div class="nxp__hint" data-x="hint">Conectando con el servidor…</div>
      </div>
      <div class="nxp__servers" data-x="dock"></div>
      <div class="nxp__eps" data-x="eps"><div class="nxp__epshead">Episodios</div></div>`;
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      const x = b.dataset.x;
      if (x === 'close') this.close();
      if (x === 'prev') this.step(-1);
      if (x === 'next') this.step(1);
      if (x === 'seen') this.markSeen();
      if (x === 'full') this.el.requestFullscreen?.().catch(() => {});
      if (x === 'cine') this.el.classList.toggle('nxp--cine');
      if (x === 'autonext') { const on = localStorage.getItem('nx.autonext') === '1'; localStorage.setItem('nx.autonext', on ? '0' : '1'); b.classList.toggle('on', !on); }
      if (b.dataset.lang) { this.lang = b.dataset.lang; this.play(this.curEp, true); }
      if (b.dataset.srv) this.setServer(+b.dataset.srv);
      if (b.dataset.ep) { const ep = this.eps().find(x => x.number === +b.dataset.ep); if (ep) this.play(ep); }
    });
    const an = $('[data-x="autonext"]', this.el);
    an.classList.toggle('on', localStorage.getItem('nx.autonext') === '1');
    // hint: se oculta al cargar el iframe o a los 6 s (lo que antes). Nunca bloquea toques.
    $('iframe', this.el).addEventListener('load', () => {
      if (this.iframe().src === 'about:blank') return;
      clearTimeout(this._toFb);
      $('[data-x="hint"]', this.el)?.classList.add('gone');
    });
  },
  eps() { return (this.detail.episodes || []).filter(e => (e.servers || []).length).sort((a, b) => (a.number ?? 0) - (b.number ?? 0)); },
  iframe() { return $('iframe', this.el); },
  play(ep, keepServer = false) {
    this.ep = ep.number ?? ep.id;
    this.curEp = ep;
    const servers = ep.servers || [];
    const langs = [...new Set(servers.map(s => s.lang || 'sin etiqueta'))];
    if (!this.lang || !langs.includes(this.lang)) this.lang = langs[0];
    const list = servers.filter(s => (s.lang || 'sin etiqueta') === this.lang);
    this.srvList = list;
    if (!keepServer || this.srvIdx >= list.length) this.srvIdx = 0;
    this.iframe().src = list[this.srvIdx]?.src || 'about:blank';
    // hint con retiro automático a los 6 s
    clearTimeout(this._toFb);
    const hint = $('[data-x="hint"]', this.el);
    if (hint) { hint.classList.remove('gone'); this._toFb = setTimeout(() => hint.classList.add('gone'), 6000); }
    $('[data-x="epinfo"]', this.el).textContent = `Episodio ${ep.number ?? '?'} de ${this.eps().length}`;
    const i = this.eps().findIndex(e => (e.number ?? e.id) === this.ep);
    // barra: anterior/siguiente/marcar visto
    let bar = $('[data-x="nav"]', this.el);
    if (!bar) {
      bar = document.createElement('span');
      bar.innerHTML = `<button class="nxp__btn" data-x="prev">‹ Anterior</button>
        <button class="nxp__btn" data-x="seen">${IC.check} Marcar visto</button>
        <button class="nxp__btn" data-x="next">Siguiente ›</button>`;
      bar.style.cssText = 'display:flex;gap:8px';
      bar.dataset.x = 'nav';
      $('.nxp__bar .nxp__sp', this.el).after(bar);
    }
    $('[data-x="prev"]', this.el).disabled = i <= 0;
    $('[data-x="next"]', this.el).disabled = i < 0 || i >= this.eps().length - 1;
    this.renderDock();
    this.renderEps();
    Lib.saveProgress(this.detail.id, this.ep, null);
    this.el.querySelector('[data-x="eps"]').scrollTop = 0;
  },
  renderDock() {
    const servers = this.curEp.servers || [];
    const langs = [...new Set(servers.map(s => s.lang || 'sin etiqueta'))];
    const list = servers.filter(s => (s.lang || 'sin etiqueta') === this.lang);
    $('[data-x="dock"]', this.el).innerHTML =
      langs.map(l => `<button class="nxp__tab ${l === this.lang ? 'on' : ''}" data-lang="${esc(l)}">${esc(l)}</button>`).join('') +
      '<span style="width:6px;flex-shrink:0"></span>' +
      list.map((s, i) => `<button class="nxp__pill ${i === this.srvIdx ? 'on' : ''}" data-srv="${i}" title="${esc(s.src)}">${esc(s.name || 'servidor')}</button>`).join('');
  },
  renderEps() {
    const box = $('[data-x="eps"]', this.el);
    const frag = document.createDocumentFragment();
    for (const ep of this.eps()) {
      const b = document.createElement('button');
      b.className = 'nxp__eprow' + ((ep.number ?? ep.id) === this.ep ? ' on' : '');
      b.dataset.ep = ep.number ?? '';
      const watched = Lib.watched(this.detail.id, ep.number);
      b.innerHTML = `
        <span class="nxp__epnum">${ep.number ?? '?'}</span>
        <span class="nxp__epinfo">
          <span class="nxp__eptitle">${esc(ep.title || 'Episodio ' + ep.number)}</span>
          <span class="nxp__epmeta">${(ep.servers || []).map(s => `<span class="nx-card__tag nx-card__tag--dim">${esc(s.name || 'servidor')}</span>`).join('')}</span>
        </span>
        ${watched ? `<span class="nxp__watched">${IC.check}</span>` : ''}
        <span class="nxp__epplay">${IC.play}</span>`;
      frag.appendChild(b);
    }
    box.querySelectorAll('.nxp__eprow').forEach(n => n.remove());
    box.appendChild(frag);
  },
  setServer(i) { this.srvIdx = i; this.iframe().src = this.srvList[i]?.src || 'about:blank'; this.renderDock();
    clearTimeout(this._toFb); const hint = $('[data-x="hint"]', this.el);
    if (hint) { hint.classList.remove('gone'); this._toFb = setTimeout(() => hint.classList.add('gone'), 6000); } },
  step(d) { const eps = this.eps(), i = eps.findIndex(e => (e.number ?? e.id) === this.ep); const n = eps[i + d]; if (n) this.play(n); },
  markSeen() {
    Lib.saveProgress(this.detail.id, this.ep, 100);
    toast(`Episodio ${this.ep} marcado como visto`);
    this.renderEps();
    if (localStorage.getItem('nx.autonext') === '1') this.step(1);
  },
  close() {
    this.iframe().src = 'about:blank';
    clearTimeout(this._toFb);
    this.el.remove(); document.body.style.overflow = '';
    document.removeEventListener('keydown', this._esc);
    route();
  },
};

/* ---------- router ---------- */
let routeSeq = 0;
async function route() {
  const seq = ++routeSeq;
  const hash = location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  markCurrent(path);
  const view = $('#view'); view.replaceChildren();
  view.innerHTML = '<div class="nx-empty">Cargando catálogo…</div>';
  window.scrollTo(0, 0);
  try {
    await Catalog.load();
    if (seq !== routeSeq) return;
    view.replaceChildren();
    const seg = path.split('/').filter(Boolean);
    if (path === '/')                     await Views.home(view);
    else if (path === '/explorar')        await Views.explore(view);
    else if (path === '/generos')         await Views.genres(view);
    else if (path === '/novedades')       await Views.news(view);
    else if (path === '/biblioteca')      await Views.library(view);
    else if (path === '/ia')              await Views.ia(view);
    else if (path === '/ajustes')         await Views.settings(view);
    else if (seg[0] === 'genero')         await Views.genre(view, { g: decodeURIComponent(seg[1] || '') });
    else if (seg[0] === 'titulo')         await Views.title(view, { id: decodeURIComponent(seg[1] || '') });
    else if (seg[0] === 'buscar')         await Views.search(view, { q: new URLSearchParams(query).get('q') || '' });
    else {
      const sec = SECTIONS.find(s => s.path === '/' + seg[0]);
      if (sec && sec.view === 'cat')      await Views.cat(view, sec);
      else view.innerHTML = '<div class="nx-empty">Ruta no encontrada.</div>';
    }
  } catch (err) {
    view.innerHTML = `<div class="nx-empty">Error al cargar el catálogo: ${esc(err.message)}</div>`;
  }
}

/* ---------- foco con teclado/mando ---------- */
document.addEventListener('keydown', e => {
  if (!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)) return;
  const cur = document.activeElement;
  if (!cur || !cur.classList.contains('nx-card')) return;
  e.preventDefault();
  const zone = cur.closest('.nx-row__track, .nx-grid') || document;
  const cards = $$('.nx-card', zone);
  const idx = cards.indexOf(cur);
  const delta = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (delta && cards[idx + delta]) return cards[idx + delta].focus();
  const zones = $$('.nx-row__track, .nx-grid');
  const zi = zones.findIndex(z => z.contains(cur));
  const z2 = zones[zi + (e.key === 'ArrowDown' ? 1 : -1)];
  if (z2) { const c2 = $$('.nx-card', z2)[Math.min(idx, $$('.nx-card', z2).length - 1)]; c2 && c2.focus(); }
});

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator)
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

/* ---------- sincronización (opt-in; se activa con window.NX_SYNC_CONFIG antes de este script) ---------- */
window.NXSync = (() => {
  const cfg = window.NX_SYNC_CONFIG;
  const LIBKEY = 'nx.lib.v1', UID = 'nx.sync.uid', TOK = 'nx.sync.tok', REF = 'nx.sync.ref', EXP = 'nx.sync.exp', TS = 'nx.sync.ts';
  let pushing = null;
  const ready = () => !!(cfg && cfg.apiKey && cfg.databaseURL);
  const store = (uid, id, ref, exp) => { localStorage.setItem(UID, uid); localStorage.setItem(TOK, id); localStorage.setItem(REF, ref); localStorage.setItem(EXP, String(exp)); };
  async function signup() {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
    if (!r.ok) throw new Error('auth ' + r.status);
    const d = await r.json();
    store(d.localId, d.idToken, d.refreshToken, Date.now() + (+d.expiresIn || 3600) * 1000);
  }
  async function refresh() {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(localStorage.getItem(REF) || '')}` });
    if (!r.ok) throw new Error('refresh ' + r.status);
    const d = await r.json();
    store(d.user_id || localStorage.getItem(UID), d.id_token, d.refresh_token || localStorage.getItem(REF), Date.now() + (+d.expires_in || 3600) * 1000);
  }
  async function ensureAuth(force = false) {
    if (!ready()) throw new Error('sin config');
    if (!localStorage.getItem(UID)) await signup();
    if (force || Date.now() > +(localStorage.getItem(EXP) || 0) - 5 * 60 * 1000) await refresh();
    return { uid: localStorage.getItem(UID), token: localStorage.getItem(TOK) };
  }
  const url = (uid, token) => `${cfg.databaseURL.replace(/\/$/, '')}/users/${uid}/lib.json?auth=${token}`;
  async function pull() {
    if (!ready()) return false;
    try {
      let { uid, token } = await ensureAuth();
      let r = await fetch(url(uid, token));
      if (r.status === 401) { ({ uid, token } = await ensureAuth(true)); r = await fetch(url(uid, token)); }
      if (!r.ok) return false;
      const remote = await r.json();
      if (!remote || !remote.data) return false;
      if (remote.ts > +(localStorage.getItem(TS) || 0)) { localStorage.setItem(LIBKEY, remote.data); localStorage.setItem(TS, remote.ts); return true; }
      return false;
    } catch { return false; }
  }
  async function pushNow() {
    if (!ready()) return;
    try {
      let { uid, token } = await ensureAuth();
      const data = localStorage.getItem(LIBKEY) || '{}';
      const ts = Date.now();
      let r = await fetch(url(uid, token), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, ts }) });
      if (r.status === 401) { ({ uid, token } = await ensureAuth(true)); r = await fetch(url(uid, token), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, ts }) }); }
      if (r.ok) localStorage.setItem(TS, String(ts));
    } catch { /* offline */ }
  }
  function push() { clearTimeout(pushing); pushing = setTimeout(pushNow, 2500); }
  return { ready, pull, push };
})();

/* ---------- arranque ---------- */
renderNav();
$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (q) location.hash = '#/buscar?q=' + encodeURIComponent(q);
});
window.addEventListener('hashchange', route);
route();
NXSync.pull().then(changed => { if (changed) route(); });
