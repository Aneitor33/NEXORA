/* NEXORA — motor v0.4 (FASE 4-5-6: cronología/relacionados · reproductor multiservidor · IA · PWA)
   Sin dependencias. Catálogo canónico nx-* con fallback demo. Reproductor: nx-player.js */
'use strict';

/* ---------------- util ---------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byU = (a, b) => new Date(b.u || 0) - new Date(a.u || 0);
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' }); };
const detailName = id => id.replace(/[:|]/g, '_');
function toast(msg) { const el = $('#statusBar'); el.textContent = msg; el.classList.add('nx-on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('nx-on'), 2200); }

/* ---------------- etiquetas ---------------- */
const L_TY  = { movie:'Película', series:'Serie' };
const L_MD  = { animation:'Animación', live:'Acción real', unconfirmed:'Medio sin confirmar' };
const L_CAT = { anime:'Anime', donghua:'Donghua', dorama:'Dorama', 'western-animation':'Animación occidental', 'live-series':'Serie de acción real', movie:'Película', other:'Otro', unconfirmed:'Sin clasificar' };
const L_ST  = { airing:'En emisión', finished:'Finalizado', upcoming:'Próximamente', gone:'Retirado', unconfirmed:'Sin confirmar' };
const L_GEN = { accion:'Acción', aventura:'Aventura', romance:'Romance', fantasia:'Fantasía', 'ciencia-ficcion':'Ciencia ficción', terror:'Terror', comedia:'Comedia', misterio:'Misterio', drama:'Drama', suspenso:'Suspense', deportes:'Deportes', historico:'Histórico', escolar:'Escolar', 'artes-marciales':'Artes marciales', supervivencia:'Supervivencia', animacion:'Animación', musica:'Música' };

/* ---------------- iconos ---------------- */
const I = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONS = {
  home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'),
  compass: I('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  film: I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  tv: I('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 3 4 3 4-3"/>'),
  spark: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
  dragon: I('<path d="M4 17c4-1 5-5 4-9 3 1 5 4 4 8 2-1 3-3 3-6 3 3 4 8-2 10H6c-2 0-2-2-2-3z"/><path d="M9 20c2 1 6 1 8-1"/>'),
  drama: I('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>'),
  play: I('<path d="M7 4.5v15l12-7.5z"/>'),
  library: I('<path d="M4 4v16M9 4v16M14 5l4 15"/><path d="M4 20h16"/>'),
  ai: I('<path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z"/>'),
  heart: I('<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  heartFill: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/></svg>',
};

/* ---------------- navegación ---------------- */
const SECTIONS = [
  { path: '/',           label: 'Inicio',       icon: 'home',     view: 'home' },
  { path: '/explorar',   label: 'Explorar',     icon: 'compass',  view: 'explore' },
  { path: '/generos',    label: 'Géneros',      icon: 'spark',    view: 'genres' },
  { path: '/novedades',  label: 'Novedades',    icon: 'clock',    view: 'news' },
  { path: '/peliculas',  label: 'Películas',    icon: 'film',     view: 'cat', cat: 'movie' },
  { path: '/series',     label: 'Series',       icon: 'tv',       view: 'cat', ty: 'series' },
  { path: '/anime',      label: 'Anime',        icon: 'spark',    view: 'cat', cat: 'anime' },
  { path: '/donghua',    label: 'Donghua',      icon: 'dragon',   view: 'cat', cat: 'donghua' },
  { path: '/doramas',    label: 'Doramas',      icon: 'drama',    view: 'cat', cat: 'dorama' },
  { path: '/animacion',  label: 'Animación',    icon: 'tv',       view: 'cat', cat: '_anim' },
  { path: '/biblioteca', label: 'Mi biblioteca',icon: 'library',  view: 'library' },
  { path: '/ia',         label: 'Asistente IA', icon: 'ai',       view: 'ia' },
  { path: '/ajustes',    label: 'Ajustes',      icon: 'settings', view: 'settings', sideEnd: true },
];
function renderNav() {
  $('#topNav').innerHTML = SECTIONS.slice(0, 8).map(s => `<a href="#${s.path}" data-path="${s.path}">${s.label}</a>`).join('');
  $('#sidebar').innerHTML = SECTIONS.map(s => `<a class="nx-sideitem ${s.sideEnd ? 'nx-sideitem--end' : ''}" href="#${s.path}" data-path="${s.path}">${ICONS[s.icon]}<span>${s.label.split(' ')[0]}</span></a>`).join('');
  $('#bottomNav').innerHTML = [SECTIONS[0], SECTIONS[1], SECTIONS[2], SECTIONS[9], SECTIONS[11]].map(s => `<a href="#${s.path}" data-path="${s.path}">${ICONS[s.icon]}<span>${s.label.split(' ')[0]}</span></a>`).join('');
}
const markCurrent = path => $$('[data-path]').forEach(a => a.getAttribute('data-path') === path ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current'));

/* ---------------- catálogo ---------------- */
const Catalog = {
  mode: null, manifest: null, items: [], issues: [],
  async load() {
    if (this.items.length) return this.items;
    try {
      const man = await (await fetch('public/data/nx-manifest.json')).json();
      const first = await (await fetch('public/data/nx-index-00.json')).json();
      const of = first.meta?.of || 1;
      const items = [...first.items];
      for (let s = 1; s < of; s++)
        items.push(...(await (await fetch(`public/data/nx-index-${String(s).padStart(2, '0')}.json`)).json()).items);
      this.mode = 'canonical'; this.manifest = man; this.items = items.filter(i => i.st !== 'gone');
      return this.items;
    } catch {
      const res = await fetch('data/catalog.donghuasub.json');
      if (!res.ok) throw new Error('No se pudo cargar el catálogo (' + res.status + ')');
      const raw = await res.json();
      this.mode = 'demo';
      this.items = raw.series.map(e => {
        let valid = true;
        if (!e.t || e.t.trim().length < 2 || e.t.trim() === '404') { valid = false; this.issues.push({ id: e.i, value: e.t }); }
        return { id: 'nx:slug:' + e.i, t: e.t, ty: 'series', md: 'animation', cat: e.ty || 'unconfirmed',
                 g: [], c: [], y: null, st: 'unconfirmed', e: null, p: e.p, u: e.u, src: 1, _valid: valid };
      }).filter(i => i._valid);
      return this.items;
    }
  },
  async detail(id) {
    if (this.mode === 'canonical') {
      /* modo cubetas (30k+): un fichero por prefijo de id, cacheado en memoria.
         modo ficheros (<4000): detalle individual. */
      if (this.manifest?.detailsMode === 'buckets') {
        this._buckets ||= new Map();
        const key = detailName(id).replace(/^nx_(hash|tmdb)_/, '').slice(0, 2) || 'zz';
        if (!this._buckets.has(key)) {
          try { this._buckets.set(key, (await (await fetch(`public/data/nx-details-b-${key}.json`)).json()).items); }
          catch { this._buckets.set(key, {}); }
        }
        return this._buckets.get(key)[id] || null;
      }
      try { return await (await fetch(`public/data/nx-details/${detailName(id)}.json`)).json(); }
      catch { return null; }
    }
    const it = this.items.find(i => i.id === id);
    return it ? { ...it, ev: {}, src: [] } : null;
  },
  counts() { return this.manifest?.conteos || null; },
  search(q) { q = q.trim().toLowerCase(); if (!q) return [];
    return this.items.filter(i => i.t.toLowerCase().includes(q)).sort(byU); },
  genresOf(list) { const m = new Map(); for (const i of list) for (const g of i.g || []) m.set(g, (m.get(g) || 0) + 1); return [...m.entries()].sort((a,b)=>b[1]-a[1]); },
};

/* ---------------- biblioteca local (favoritos · progreso · historial) ---------------- */
const Lib = {
  key: 'nx.lib.v1',
  read()  { try { return JSON.parse(localStorage.getItem(this.key)) || { favs: {}, progress: {}, history: {} }; } catch { return { favs: {}, progress: {}, history: {} }; } },
  write(d){ localStorage.setItem(this.key, JSON.stringify(d)); if (window.NXSync) NXSync.push(); },
  toggleFav(id) { const d = this.read(); d.favs[id] ? delete d.favs[id] : d.favs[id] = Date.now(); this.write(d); return !!d.favs[id]; },
  isFav(id)     { return !!this.read().favs[id]; },
  favs()        { const d = this.read(); return Catalog.items.filter(i => d.favs[i.id]); },
  saveProgress(id, ep, pct) {
    const d = this.read();
    d.progress[id] = { ep, pct, ts: Date.now() };
    d.history[id] = { ep, ts: Date.now() };
    this.write(d);
  },
  progress(id)  { return this.read().progress[id] || null; },
  continueList(){ const d = this.read(); return Object.entries(d.progress).map(([id, p]) => ({ item: Catalog.items.find(i => i.id === id), p })).filter(x => x.item).sort((a,b)=>b.p.ts-a.p.ts); },
  historyList() { const d = this.read(); return Object.entries(d.history).map(([id, h]) => ({ item: Catalog.items.find(i => i.id === id), h })).filter(x => x.item).sort((a,b)=>b.h.ts-a.h.ts); },
};

/* ---------------- UI ---------------- */
const imgObserver = new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting) { const img = en.target; img.src = img.dataset.src; imgObserver.unobserve(img); } }, { rootMargin: '200px' });
const metaLine = it => { const b = []; if (it.y) b.push(String(it.y)); b.push(L_ST[it.st] || 'Sin confirmar'); if (it.e) b.push(it.e + (it.ty === 'movie' ? '' : ' ep.')); return b.join(' · '); };

function card(item, prog) {
  const a = document.createElement('a');
  a.className = 'nx-card'; a.href = `#/titulo/${encodeURIComponent(item.id)}`; a.setAttribute('aria-label', item.t);
  a.innerHTML = `
    <div class="nx-card__poster">
      <div class="nx-card__fallback">${esc((item.t || '?').trim().charAt(0).toUpperCase())}</div>
      ${item.p ? `<img data-src="${esc(item.p)}" alt="" loading="lazy">` : ''}
    </div>
    <div class="nx-card__body">
      <h3 class="nx-card__title">${esc(item.t)}</h3>
      <div class="nx-card__meta"><span class="nx-card__tag">${esc(L_CAT[item.cat] || 'Sin clasificar')}</span><span>${esc(metaLine(item))}</span></div>
    </div>
    ${prog != null ? `<div class="nx-card__prog"><i style="width:${prog}%"></i></div>` : ''}`;
  const img = a.querySelector('img');
  if (img) { img.addEventListener('load', () => img.classList.add('nx-loaded'), { once: true }); imgObserver.observe(img); }
  return a;
}
function row(title, items, { hint = '', more = null, prog = null } = {}) {
  const sec = document.createElement('section'); sec.className = 'nx-row';
  sec.innerHTML = `<div class="nx-row__head"><h2 class="nx-row__title">${esc(title)}</h2>
    ${hint ? `<span class="nx-row__hint">${esc(hint)}</span>` : ''}
    ${more ? `<a class="nx-row__more" href="${more}">Ver todo</a>` : ''}</div><div class="nx-row__track" role="list"></div>`;
  const track = $('.nx-row__track', sec);
  if (!items.length) { sec.querySelector('.nx-row__head').insertAdjacentHTML('afterend', '<div class="nx-empty">Sin contenido todavía.</div>'); return sec; }
  items.forEach(i => track.appendChild(prog ? card(i.item ?? i, (i.item ? (i.p.pct ?? 10) : null)) : card(i)));
  return sec;
}
function hero(item) {
  const el = document.createElement('section'); el.className = 'nx-hero';
  el.innerHTML = `<div class="nx-hero__content">
    <span class="nx-hero__badge">${esc(L_CAT[item.cat] || 'Destacado')}</span>
    <h1 class="nx-hero__title">${esc(item.t)}</h1>
    <div class="nx-hero__meta"><span class="ok">NEXORA</span><span>${esc(L_TY[item.ty] || '')}</span><span>${esc(metaLine(item))}</span></div>
    <p class="nx-hero__syn">${Catalog.mode === 'canonical' ? 'Ficha con temporadas, episodios y fuentes disponibles.' : 'Índice demo: detalles completos con el catálogo canónico.'}</p>
    <div class="nx-hero__actions">
      <a class="nx-btn nx-btn--primary" href="#/titulo/${encodeURIComponent(item.id)}">${ICONS.play} Ver ficha</a>
      <button class="nx-btn nx-btn--ghost" data-fav="${esc(item.id)}">${Lib.isFav(item.id) ? ICONS.heartFill : ICONS.heart} Mi lista</button>
    </div></div>`;
  bindFav(el);
  return el;
}
function bindFav(root) {
  $$('[data-fav]', root).forEach(btn => btn.addEventListener('click', () => {
    const added = Lib.toggleFav(btn.dataset.fav);
    btn.innerHTML = (added ? ICONS.heartFill : ICONS.heart) + ' Mi lista';
    toast(added ? 'Añadido a Mi lista' : 'Quitado de Mi lista');
  }));
}

/* ---------------- vistas ---------------- */
/* rejilla paginada: nunca más de CAP tarjetas en el DOM (30k títulos sin colgar el TV Box) */
const GRID_CAP = 240;
function fillGrid(grid, list, emptyMsg) {
  const drawN = n => {
    grid.replaceChildren(...list.slice(0, n).map(i => card(i)));
    const old = grid.querySelector('[data-more]'); if (old) old.remove();
    if (!list.length) { grid.innerHTML = `<div class="nx-empty" style="grid-column:1/-1">${emptyMsg}</div>`; return; }
    if (list.length > n) {
      const more = document.createElement('button');
      more.className = 'nx-chip'; more.dataset.more = '1'; more.style.gridColumn = '1/-1';
      more.textContent = `Cargar más (${list.length - n} restantes)`;
      more.addEventListener('click', () => drawN(n + GRID_CAP));
      grid.appendChild(more);
    }
  };
  drawN(Math.min(GRID_CAP, list.length));
}
const Views = {
  async home(view) {
    const items = await Catalog.load();
    const latest = [...items].sort(byU);
    if (latest.length) view.appendChild(hero(latest[0]));
    const rows = document.createElement('div'); rows.className = 'nx-rows';
    const cont = Lib.continueList();
    if (cont.length) rows.appendChild(row('Continuar viendo', cont, { hint: 'tu progreso' }));
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
      ? `Catálogo central: ${c.canonicos_unicos} títulos únicos (${c.records_originales} registros de ${Object.keys(c.aceptados_por_fuente || {}).length} fuentes · ${c.pendientes_revision} pendientes de revisión).`
      : `Modo demo: ${items.length} títulos de la fuente donghuasub. Ejecuta scripts/build-index.mjs tras un sync para el catálogo completo.`;
    view.appendChild(note);
  },

  async cat(view, sec) {
    const items = await Catalog.load();
    let list;
    if (sec.cat === '_anim') list = items.filter(i => ['anime','donghua','western-animation'].includes(i.cat));
    else if (sec.ty)      list = items.filter(i => i.ty === sec.ty);
    else                  list = items.filter(i => i.cat === sec.cat);
    const title = sec.cat === '_anim' ? 'Animación' : sec.label;
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>${esc(title)}</h1>
      <p>${list.length} títulos${Catalog.mode === 'canonical' ? ' · catálogo central NEXORA' : ' · fuente demo'}</p></div>`);
    const chips = document.createElement('div'); chips.className = 'nx-filters';
    chips.innerHTML = `<button class="nx-chip" data-mode="rec" aria-pressed="true">Recientes</button>
      <button class="nx-chip" data-mode="az" aria-pressed="false">A–Z</button>
      <button class="nx-chip" data-mode="air" aria-pressed="false">En emisión</button>
      <button class="nx-chip" data-mode="fin" aria-pressed="false">Finalizados</button>
      <span style="flex-basis:100%"></span>` +
      Catalog.genresOf(list).slice(0, 10).map(([g]) => `<button class="nx-chip" data-genre="${esc(g)}" aria-pressed="false">${esc(L_GEN[g] || g)}</button>`).join('');
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
        $$('[data-genre]', chips).forEach(c => c.setAttribute('aria-pressed', c.dataset.genre === genre)); }
      else $$('[data-mode]', chips).forEach(c => c.setAttribute('aria-pressed', c === b));
      draw($('[data-mode][aria-pressed="true"]', chips)?.dataset.mode || 'rec');
    });
    draw('rec');
  },

  async explore(view) {
    const items = await Catalog.load();
    const c = Catalog.counts();
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Explorar</h1>
      <p>${c ? `${c.canonicos_unicos} títulos únicos canónicos.` : `${items.length} títulos (demo).`} Filtros combinables.</p></div>`);
    const chips = document.createElement('div'); chips.className = 'nx-filters';
    const cats = [...new Set(items.map(i => i.cat))];
    chips.innerHTML =
      `<button class="nx-chip" data-f="ty:movie" aria-pressed="false">Películas</button>
       <button class="nx-chip" data-f="ty:series" aria-pressed="false">Series</button>` +
      cats.map(x => `<button class="nx-chip" data-f="cat:${x}" aria-pressed="false">${esc(L_CAT[x] || x)}</button>`).join('') +
      `<span style="flex-basis:100%"></span>` +
      Catalog.genresOf(items).slice(0, 12).map(([g]) => `<button class="nx-chip" data-f="g:${esc(g)}" aria-pressed="false">${esc(L_GEN[g] || g)}</button>`).join('') +
      `<span style="flex-basis:100%"></span>
       <button class="nx-chip" data-f="st:airing" aria-pressed="false">En emisión</button>
       <button class="nx-chip" data-f="st:finished" aria-pressed="false">Finalizados</button>`;
    view.appendChild(chips);
    const grid = document.createElement('div'); grid.className = 'nx-grid'; view.appendChild(grid);
    const active = new Set();
    const draw = () => {
      let l = items.filter(i => {
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
      b.setAttribute('aria-pressed', active.has(f)); draw(); });
    draw();
  },

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
      <div class="nx-title-poster">${it.p ? `<img src="${esc(it.p)}" alt="Póster de ${esc(it.t)}">` : `<div class="nx-card__fallback" style="font-size:72px">${esc(it.t.charAt(0))}</div>`}</div>
      <div class="nx-title-info">
        <span class="nx-hero__badge">${esc(L_CAT[it.cat] || 'Sin clasificar')}</span>
        <h1>${esc(it.t)}</h1>
        <div class="nx-hero__meta"><span class="ok">${esc(L_TY[it.ty] || '')}</span><span>${esc(L_MD[it.md] || '')}</span>
          <span>${esc(metaLine(it))}</span>${(it.c || []).length ? `<span>${esc(it.c.join(' · '))}</span>` : ''}</div>
        <p>${det?.d?.syn ? esc(det.d.syn) : 'Sinopsis no disponible en las fuentes (sin confirmar).'}</p>
        <div class="nx-hero__actions">
          ${playable ? `<button class="nx-btn nx-btn--accent" data-play>${ICONS.play} ${prog ? `Continuar (ep. ${prog.ep})` : 'Reproducir'}</button>` : `<button class="nx-btn nx-btn--accent" disabled title="Sin fuentes disponibles todavía">${ICONS.play} Reproducir</button>`}
          <button class="nx-btn nx-btn--ghost" data-fav="${esc(id)}">${fav ? ICONS.heartFill : ICONS.heart} Mi lista</button>
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
      ${eps.length ? `<h2 class="nx-row__title" style="margin:0 0 10px">Episodios (${eps.length})</h2>
      <div class="nx-kv" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${eps.slice(0, 80).map(ep => `
        <div><dt>Episodio ${ep.number ?? '?'}</dt><dd>${esc(ep.title || '')}</dd>
        <dd style="margin-top:6px">${(ep.servers || []).map(s => `<span class="nx-card__tag nx-card__tag--dim">${esc(s.name || 'servidor')}${s.lang ? ' · ' + esc(s.lang) : ''}</span>`).join(' ') || '<span class="nx-card__tag nx-card__tag--dim">sin fuentes</span>'}
        ${(ep.servers || []).length ? `<button class="nx-btn nx-btn--ghost" style="padding:5px 10px;font-size:11px;margin-left:6px" data-ep="${ep.number}">▶</button>` : ''}</dd></div>`).join('')}</div>
      ${eps.length > 80 ? `<p class="nx-empty">Mostrando 80 de ${eps.length} episodios.</p>` : ''}` : ''}
    </div>`);
    bindFav(view);
    $('[data-play]', view)?.addEventListener('click', () => NXPlayer.open(det, prog?.ep ?? null));
    $$('[data-ep]', view).forEach(b => b.addEventListener('click', () => NXPlayer.open(det, +b.dataset.ep)));
    if (related.length) view.appendChild(row('Contenido relacionado', related));
  },

  async search(view, { q }) {
    const r = Catalog.search(q);
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Resultados para “${esc(q)}”</h1><p>${r.length} coincidencias.</p></div>`);
    const grid = document.createElement('div'); grid.className = 'nx-grid';
    fillGrid(grid, r, 'Sin coincidencias.');
    view.appendChild(grid);
  },

  async library(view) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Mi biblioteca</h1><p>Favoritos, progreso e historial en este dispositivo; sincronización entre dispositivos: siguiente iteración (puente Firebase).</p></div>`);
    view.appendChild(row('Mi lista', Lib.favs()));
    view.appendChild(row('Continuar viendo', Lib.continueList(), { prog: true }));
    view.appendChild(row('Historial', Lib.historyList().map(x => x.item)));
  },

  async ia(view) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Asistente IA</h1>
      <p>Recomendaciones solo del catálogo real. Configura GEMINI_API_KEY o GROQ_API_KEY como secreto en Cloudflare (Settings → Environment variables).</p></div>
      <div class="nx-filters" style="flex-direction:column;align-items:stretch;gap:10px" id="chat">
        <div data-msgs style="max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div>
        <form data-form style="display:flex;gap:8px">
          <input data-q placeholder="Quiero algo de fantasía con romance y protagonista poderoso…" style="flex:1;padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#14141c;color:#f7f7fa">
          <button class="nx-btn nx-btn--accent" type="submit">Enviar</button>
        </form>
      </div><div id="ia-results" style="padding:0 var(--nx-pad-view)"></div>`);
    const box = $('[data-msgs]', view);
    const addMsg = (txt, me) => box.insertAdjacentHTML('beforeend',
      `<div style="align-self:${me ? 'flex-end' : 'flex-start'};max-width:82%;padding:9px 13px;border-radius:12px;background:${me ? 'linear-gradient(110deg,#f20d35,#9d0926)' : 'var(--nx-bg-elev-2)'};font-size:13.5px">${esc(txt)}</div>`);
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
        const res = $('#ia-results'); res.replaceChildren();
        if (d.picks?.length) {
          res.appendChild(row('Recomendado para ti', d.picks.map(p => Catalog.items.find(i => i.id === p.id)).filter(Boolean)));
        }
      } catch { box.lastElementChild.remove(); addMsg('No se pudo contactar con el asistente (¿está en Cloudflare Pages con functions?).', false); }
    });
  },

  async genres(view) {
    const items = await Catalog.load();
    const counts = Catalog.genresOf(items);
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Géneros</h1><p>${counts.length} géneros con contenido. Toca uno para explorarlo.</p></div>
      <div class="nx-filters">${counts.map(([g, n]) => `<a class="nx-chip" href="#/genero/${encodeURIComponent(g)}">${esc(L_GEN[g] || g)} · ${n}</a>`).join('')}</div>
      ${counts.length ? '' : '<div class="nx-empty">Los géneros aparecen cuando el enriquecimiento (dfx-genres/TMDB) los confirma.</div>'}`);
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
    const byU = list => [...list].sort((a, b) => new Date(b.u || 0) - new Date(a.u || 0));
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Novedades</h1><p>Cronología por fechas verificadas: incorporación/actualización (no confundir con estreno).</p></div>`);
    const rows = document.createElement('div'); rows.className = 'nx-rows';
    const w7 = byU(items.filter(i => new Date(i.u || 0).getTime() >= d7));
    const w30 = byU(items.filter(i => { const t = new Date(i.u || 0).getTime(); return t >= d30 && t < d7; }));
    if (w7.length) rows.appendChild(row('Actualizados esta semana', w7.slice(0, 24)));
    if (w30.length) rows.appendChild(row('Últimos 30 días', w30.slice(0, 24)));
    for (const y of [2026, 2025, 2024]) {
      const l = items.filter(i => i.y === y).sort((a, b) => byU([a, b])[0] === a ? -1 : 1).slice(0, 18);
      if (l.length) rows.appendChild(row(`Estrenos ${y}`, l, { hint: 'por año de estreno' }));
    }
    view.appendChild(rows);
  },

  async settings(view) {
    const c = Catalog.counts();
    let rep = null;
    try { rep = await (await fetch('public/data/nx-report.json')).json(); } catch {}
    const srcRows = rep ? Object.entries(rep.sources || {}).map(([tag, s]) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid var(--nx-line)">${esc(tag)}</td>
       <td style="padding:6px 10px;border-bottom:1px solid var(--nx-line)">${esc(s.estado || '—')}${s.reasons?.length ? `<div style="color:var(--nx-text-mute);font-size:11px;margin-top:2px">${esc(s.reasons.join(' · '))}</div>` : ''}</td>
       <td style="padding:6px 10px;border-bottom:1px solid var(--nx-line)">${s.actual ?? '—'}</td></tr>`).join('') : '';
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Ajustes</h1><p>Estado del catálogo y preferencias locales.</p></div>
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
        <button class="nx-chip" id="setAutonext" aria-pressed="${localStorage.getItem('nx.autonext') === '1'}">Autoplay siguiente episodio</button>
      </div>
      <h2 class="nx-row__title" style="margin:0 0 10px">Aplicación</h2>
      <div class="nx-filters" style="padding:0">
        <button class="nx-chip" id="setInstall">Instalar app (PWA)</button>
        <button class="nx-chip" id="setClear">Borrar datos locales (favoritos, progreso, historial)</button>
      </div>
      <p class="nx-empty" style="text-align:left;padding:18px 0">La sincronización entre dispositivos (cuenta) se activará cuando conectemos el backend; los datos actuales viven solo en este dispositivo.</p>
    </div>`);
    $('#setAutonext', view).addEventListener('click', e => {
      const on = localStorage.getItem('nx.autonext') === '1';
      localStorage.setItem('nx.autonext', on ? '0' : '1');
      e.currentTarget.setAttribute('aria-pressed', String(!on));
      toast(!on ? 'Autoplay activado' : 'Autoplay desactivado');
    });
    $('#setClear', view).addEventListener('click', () => {
      if (confirm('¿Borrar favoritos, progreso e historial de este dispositivo?')) {
        localStorage.removeItem(Lib.key); toast('Datos locales borrados'); route();
      }
    });
    let deferred = null;
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; }, { once: true });
    $('#setInstall', view).addEventListener('click', async () => {
      if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; }
      else toast('Si la app es instalable, usa el menú del navegador → "Añadir a pantalla de inicio".');
    });
  },

  async placeholder(view, title, msg) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>${esc(title)}</h1><p>${esc(msg)}</p></div>`);
  },
};

/* ---------------- router ---------------- */
async function route() {
  const hash = location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  markCurrent(path);
  const view = $('#view'); view.replaceChildren();
  window.scrollTo(0, 0);
  try {
    await Catalog.load();
    const seg = path.split('/').filter(Boolean);
    if (path === '/')                     await Views.home(view);
    else if (path === '/explorar')        await Views.explore(view);
    else if (path === '/generos')         await Views.genres(view);
    else if (path === '/novedades')       await Views.news(view);
    else if (seg[0] === 'genero')         await Views.genre(view, { g: decodeURIComponent(seg[1] || '') });
    else if (path === '/biblioteca')      await Views.library(view);
    else if (path === '/ia')              await Views.ia(view);
    else if (path === '/ajustes')         await Views.settings(view);
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

/* ---------------- foco teclado/mando ---------------- */
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

/* ---------------- PWA (inyectado: no requiere tocar index.html) ---------------- */
(function pwa() {
  const link = document.createElement('link');
  link.rel = 'manifest'; link.href = 'manifest.webmanifest';
  document.head.appendChild(link);
  if ('serviceWorker' in navigator)
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();

/* ---------------- arranque ---------------- */
renderNav();
$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (q) location.hash = '#/buscar?q=' + encodeURIComponent(q);
});
window.addEventListener('hashchange', route);
route();
/* sync entre dispositivos: si NX_SYNC_CONFIG está definido (nx-sync.js), traer cambios */
if (window.NXSync) NXSync.pull().then(changed => { if (changed) route(); });
