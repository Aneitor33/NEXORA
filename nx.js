/* NEXORA — motor v0.1 (fase 3, base funcional sobre datos reales)
   Sin dependencias. Módulos internos: util, icons, nav, catalog, store, ui, views, router, focus */
'use strict';

/* ---------------- util ---------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const byUpdatedDesc = (a, b) => new Date(b.u) - new Date(a.u);
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' }); } catch { return '—'; } };

function toast(msg) {
  const el = $('#statusBar'); el.textContent = msg; el.classList.add('nx-on');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('nx-on'), 2200);
}

/* ---------------- icons (SVG inline, sin emojis) ---------------- */
const I = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}${extra}</svg>`;
const ICONS = {
  home:     I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'),
  compass:  I('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  film:     I('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  tv:       I('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 3 4 3 4-3"/>'),
  spark:    I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
  dragon:   I('<path d="M4 17c4-1 5-5 4-9 3 1 5 4 4 8 2-1 3-3 3-6 3 3 4 8-2 10H6c-2 0-2-2-2-3z"/><path d="M9 20c2 1 6 1 8-1"/>'),
  drama:    I('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>'),
  play:     I('<path d="M7 4.5v15l12-7.5z"/>'),
  library:  I('<path d="M4 4v16M9 4v16M14 5l4 15"/><path d="M4 20h16"/>'),
  ai:       I('<path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z"/>'),
  heart:    I('<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>'),
  heartFill:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/></svg>',
  star:     I('<path d="m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z"/>'),
};

/* ---------------- navegación ---------------- */
const SECTIONS = [
  { path: '/',          label: 'Inicio',      icon: 'home',    view: 'home' },
  { path: '/explorar',  label: 'Explorar',    icon: 'compass', view: 'explore' },
  { path: '/peliculas', label: 'Películas',   icon: 'film',    view: 'cat', cat: 'pelicula' },
  { path: '/series',    label: 'Series',      icon: 'tv',      view: 'cat', cat: 'serie' },
  { path: '/anime',     label: 'Anime',       icon: 'spark',   view: 'cat', cat: 'anime' },
  { path: '/donghua',   label: 'Donghua',     icon: 'dragon',  view: 'cat', cat: 'donghua' },
  { path: '/doramas',   label: 'Doramas',     icon: 'drama',   view: 'cat', cat: 'dorama' },
  { path: '/biblioteca',label: 'Mi biblioteca', icon: 'library', view: 'library' },
  { path: '/ia',        label: 'Asistente IA',icon: 'ai',      view: 'ai' },
  { path: '/ajustes',   label: 'Ajustes',     icon: 'settings',view: 'settings', sideEnd: true },
];
function renderNav() {
  $('#topNav').innerHTML   = SECTIONS.slice(0, 8).map(s => `<a href="#${s.path}" data-path="${s.path}">${s.label}</a>`).join('');
  $('#sidebar').innerHTML  = SECTIONS.map(s => `<a class="nx-sideitem ${s.sideEnd ? 'nx-sideitem--end' : ''}" href="#${s.path}" data-path="${s.path}">${ICONS[s.icon]}<span>${s.label.split(' ')[0]}</span></a>`).join('');
  $('#bottomNav').innerHTML= [SECTIONS[0], SECTIONS[1], SECTIONS[5], SECTIONS[7], SECTIONS[9]].map(s => `<a href="#${s.path}" data-path="${s.path}">${ICONS[s.icon]}<span>${s.label.split(' ')[0]}</span></a>`).join('');
}
function markCurrent(path) {
  $$('[data-path]').forEach(a => a.getAttribute('data-path') === path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}

/* ---------------- catálogo: adaptador + índice ---------------- */
/* Contrato canónico por título: {id, t, ty, cat, u, p, _src, _valid}
   El adaptador VALIDA la fuente (no corrige datos: marca lo inválido). */
const Catalog = {
  raw: null, items: [], issues: [],
  async load() {
    if (this.items.length) return this.items;
    const res = await fetch('data/catalog.donghuasub.json');
    if (!res.ok) throw new Error('No se pudo cargar el catálogo (' + res.status + ')');
    this.raw = await res.json();
    this.items = this.raw.series.map(e => this.normalize(e));
    return this.items;
  },
  normalize(e) {
    // Reglas de validación deterministas (ver docs/contratos-de-datos.md)
    let valid = true;
    if (!e.t || e.t.trim().length < 2 || e.t.trim() === '404') {
      valid = false;
      this.issues.push({ id: e.i, reason: 'título inválido', value: e.t });
    }
    return { id: e.i, t: e.t, ty: 'serie', cat: e.ty || 'sin-clasificar',
             u: e.u, p: e.p, _src: 'donghuasub', _valid: valid };
  },
  valid()        { return this.items.filter(i => i._valid); },
  byUpdated(n)   { return [...this.valid()].sort(byUpdatedDesc).slice(0, n); },
  byCat(cat)     { return this.valid().filter(i => i.cat === cat); },
  search(q)      { q = q.trim().toLowerCase(); if (!q) return [];
                   return this.valid().filter(i => i.t.toLowerCase().includes(q)).sort(byUpdatedDesc); },
};

/* ---------------- biblioteca (localStorage; sync externo en fase 5) ---------------- */
const Lib = {
  key: 'nx.lib.v1',
  read()  { try { return JSON.parse(localStorage.getItem(this.key)) || { favs: {}, progress: {} }; } catch { return { favs: {}, progress: {} }; } },
  write(d){ localStorage.setItem(this.key, JSON.stringify(d)); },
  toggleFav(id) { const d = this.read(); d.favs[id] ? delete d.favs[id] : d.favs[id] = Date.now(); this.write(d); return !!d.favs[id]; },
  isFav(id)     { return !!this.read().favs[id]; },
  favs()        { const d = this.read(); return Catalog.valid().filter(i => d.favs[i.id]); },
  continueList(){ const d = this.read(); return Object.keys(d.progress).map(id => Catalog.items.find(i => i.id === id)).filter(Boolean); },
};

/* ---------------- UI: tarjetas, filas, hero ---------------- */
const imgObserver = new IntersectionObserver(entries => {
  for (const en of entries) if (en.isIntersecting) { const img = en.target; img.src = img.dataset.src; imgObserver.unobserve(img); }
}, { rootMargin: '200px' });

function card(item, opts = {}) {
  const a = document.createElement('a');
  a.className = 'nx-card'; a.href = `#/titulo/${encodeURIComponent(item.id)}`;
  a.dataset.id = item.id;
  a.setAttribute('aria-label', item.t);
  const initial = esc((item.t || '?').trim().charAt(0).toUpperCase());
  a.innerHTML = `
    <div class="nx-card__poster">
      <div class="nx-card__fallback">${initial}</div>
      ${item.p ? `<img data-src="${esc(item.p)}" alt="" loading="lazy">` : ''}
    </div>
    <div class="nx-card__body">
      <h3 class="nx-card__title">${esc(item.t)}</h3>
      <div class="nx-card__meta">
        <span class="nx-card__tag">${esc(item.cat)}</span>
        <span>${fmtDate(item.u)}</span>
      </div>
    </div>
    ${opts.progress ? `<div class="nx-card__prog"><i style="width:${opts.progress}%"></i></div>` : ''}`;
  const img = a.querySelector('img');
  if (img) { img.addEventListener('load', () => img.classList.add('nx-loaded'), { once: true }); imgObserver.observe(img); }
  return a;
}

function row(title, items, { hint = '', more = null } = {}) {
  const sec = document.createElement('section');
  sec.className = 'nx-row';
  sec.innerHTML = `<div class="nx-row__head">
      <h2 class="nx-row__title">${esc(title)}</h2>
      ${hint ? `<span class="nx-row__hint">${esc(hint)}</span>` : ''}
      ${more ? `<a class="nx-row__more" href="${more}">Ver todo</a>` : ''}
    </div><div class="nx-row__track" role="list"></div>`;
  const track = $('.nx-row__track', sec);
  items.forEach(i => track.appendChild(card(i)));
  if (!items.length) sec.innerHTML = `<div class="nx-row__head"><h2 class="nx-row__title">${esc(title)}</h2></div><div class="nx-empty">Sin contenido todavía.</div>`;
  return sec;
}

function hero(item) {
  const el = document.createElement('section');
  el.className = 'nx-hero';
  el.innerHTML = `<div class="nx-hero__content">
    <span class="nx-hero__badge">Destacado</span>
    <h1 class="nx-hero__title">${esc(item.t)}</h1>
    <div class="nx-hero__meta">
      <span class="ok">NEXORA</span><span>${esc(item.cat)}</span><span>Actualizado ${fmtDate(item.u)}</span>
    </div>
    <p class="nx-hero__syn">Sinopsis no disponible en el índice: los detalles (sinopsis, géneros, temporadas) se cargan bajo demanda en la ficha, desde el detalle canónico.</p>
    <div class="nx-hero__actions">
      <a class="nx-btn nx-btn--primary" href="#/titulo/${encodeURIComponent(item.id)}">${I('<path d="M7 4.5v15l12-7.5z"/>')} Ver ficha</a>
      <button class="nx-btn nx-btn--ghost" data-fav="${esc(item.id)}">${Lib.isFav(item.id) ? ICONS.heartFill : ICONS.heart} Mi lista</button>
    </div>
  </div>`;
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
const Views = {
  async home(view) {
    const items = await Catalog.load();
    const latest = Catalog.byUpdated(14);
    view.appendChild(hero(latest[0]));
    const cont = Lib.continueList();
    if (cont.length) view.appendChild(row('Continuar viendo', cont, { hint: 'tu progreso' }));
    const rows = document.createElement('div'); rows.className = 'nx-rows';
    rows.appendChild(row('Tendencias', latest.slice(0, 12), { hint: 'ordenados por actividad reciente', more: '#/donghua' }));
    rows.appendChild(row('Lo más nuevo', Catalog.byUpdated(40).slice(14, 26), { hint: 'recién incorporados' }));
    rows.appendChild(row('Donghua destacado', Catalog.byCat('donghua').slice(0, 18), { more: '#/donghua' }));
    view.appendChild(rows);
    if (Catalog.issues.length) {
      const n = document.createElement('p'); n.className = 'nx-empty';
      n.textContent = `Validación de datos: ${Catalog.issues.length} registro(s) marcados como inválidos y ocultados (p. ej. título "404"). El pipeline de CI los reportará.`;
      view.appendChild(n);
    }
  },

  async cat(view, { cat }) {
    const all = Catalog.byCat(cat);
    const sec = SECTIONS.find(s => s.cat === cat);
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>${esc(sec ? sec.label : cat)}</h1>
      <p>${all.length} títulos · fuente: donghuasub (índice lite). Los metadatos completos llegan con el detalle canónico.</p></div>`);
    const chips = document.createElement('div'); chips.className = 'nx-filters';
    const modes = [['rec', 'Recientes'], ['az', 'A–Z'], ['val', 'Solo válidos']];
    chips.innerHTML = modes.map(([k, l], i) => `<button class="nx-chip" data-mode="${k}" aria-pressed="${i === 0}">${l}</button>`).join('');
    view.appendChild(chips);
    const grid = document.createElement('div'); grid.className = 'nx-grid'; view.appendChild(grid);
    const draw = mode => {
      let list = [...all];
      if (mode === 'az') list.sort((a, b) => a.t.localeCompare(b.t));
      if (mode !== 'val') list = list.filter(i => i._valid);
      grid.replaceChildren(...list.map(i => card(i)));
    };
    chips.addEventListener('click', e => {
      const b = e.target.closest('[data-mode]'); if (!b) return;
      $$('[data-mode]', chips).forEach(c => c.setAttribute('aria-pressed', c === b));
      draw(b.dataset.mode);
    });
    draw('rec');
  },

  async explore(view) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Explorar</h1>
      <p>Los filtros combinables completos (tipo × medio × categoría × género × país × año × estado) se activan cuando el índice canónico incluya esos metadatos. Hoy: búsqueda + orden.</p></div>`);
    const grid = document.createElement('div'); grid.className = 'nx-grid';
    grid.replaceChildren(...Catalog.byUpdated(999).map(i => card(i)));
    view.appendChild(grid);
  },

  async title(view, { id }) {
    const item = Catalog.items.find(i => i.id === id);
    if (!item) { view.innerHTML = '<div class="nx-empty">Título no encontrado.</div>'; return; }
    const fav = Lib.isFav(item.id);
    view.insertAdjacentHTML('beforeend', `
    <section class="nx-title-hero"><div class="nx-title-grid">
      <div class="nx-title-poster">${item.p ? `<img src="${esc(item.p)}" alt="Póster de ${esc(item.t)}">` : `<div class="nx-card__fallback" style="font-size:72px">${esc(item.t.charAt(0))}</div>`}</div>
      <div class="nx-title-info">
        <span class="nx-hero__badge">${esc(item.cat)}</span>
        <h1>${esc(item.t)}</h1>
        <div class="nx-hero__meta"><span class="ok">Serie</span><span>Actualizado ${fmtDate(item.u)}</span><span>Fuente: ${esc(item._src)}</span></div>
        <p>Sinopsis, géneros, país, año y temporadas: disponibles cuando el detalle canónico (<code>nx-details/${esc(item.id)}.json</code>) se genere en el pipeline. Este índice de origen no los incluye y no se inventan.</p>
        <div class="nx-hero__actions">
          <button class="nx-btn nx-btn--accent" disabled title="Pendiente de la auditoría del multiservidor (Fase 2)">${ICONS.play} Reproducir</button>
          <button class="nx-btn nx-btn--ghost" data-fav="${esc(item.id)}">${fav ? ICONS.heartFill : ICONS.heart} Mi lista</button>
        </div>
      </div>
    </div></section>
    <div class="nx-detailbody"><dl class="nx-kv">
      <div><dt>Identificador canónico</dt><dd>nx:slug:${esc(item.id)}</dd></div>
      <div><dt>Tipo / Medio</dt><dd>Serie · Animación</dd></div>
      <div><dt>Categoría</dt><dd>${esc(item.cat)}</dd></div>
      <div><dt>Estado</dt><dd>Sin confirmar</dd></div>
      <div><dt>Estreno</dt><dd>Sin confirmar</dd></div>
      <div><dt>ID de origen</dt><dd>donghuasub:${esc(item.id)}</dd></div>
    </dl></div>`);
    bindFav(view);
  },

  async search(view, { q }) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Resultados para “${esc(q)}”</h1><p>${Catalog.search(q).length} coincidencias (título, parcial, sin distinguir mayúsculas).</p></div>`);
    const grid = document.createElement('div'); grid.className = 'nx-grid';
    grid.replaceChildren(...Catalog.search(q).map(i => card(i)));
    view.appendChild(grid);
  },

  async library(view) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>Mi biblioteca</h1><p>Favoritos y progreso se guardan localmente; la sincronización entre dispositivos llega en la Fase 5.</p></div>`);
    view.appendChild(row('Mi lista', Lib.favs()));
    view.appendChild(row('Continuar viendo', Lib.continueList()));
  },

  async placeholder(view, title, msg) {
    view.insertAdjacentHTML('beforeend', `<div class="nx-viewhead"><h1>${esc(title)}</h1><p>${esc(msg)}</p></div>`);
  },
};

/* ---------------- router ---------------- */
async function route() {
  const hash = location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  markCurrent(path === '/' ? '/' : '/' + path.split('/')[1]);
  const view = $('#view'); view.replaceChildren();
  window.scrollTo(0, 0);
  try {
    await Catalog.load(); // el índice es pequeño; en producción: manifest + shards bajo demanda
    const seg = path.split('/').filter(Boolean);
    if (path === '/')                      await Views.home(view);
    else if (path === '/explorar')         await Views.explore(view);
    else if (path === '/biblioteca')       await Views.library(view);
    else if (path === '/ia')               await Views.placeholder(view, 'Asistente IA', 'Se conectará con functions/api/ai.js (claves solo en servidor) cuando el índice canónico esté listo. Nunca recomendará títulos fuera del catálogo.');
    else if (path === '/ajustes')          await Views.placeholder(view, 'Ajustes', 'Tema, reproducción y sincronización: Fase 5–6.');
    else if (seg[0] === 'titulo')          await Views.title(view, { id: decodeURIComponent(seg[1] || '') });
    else if (seg[0] === 'buscar')          await Views.search(view, { q: new URLSearchParams(query).get('q') || '' });
    else {
      const sec = SECTIONS.find(s => s.path === '/' + seg[0]);
      if (sec && sec.view === 'cat')       await Views.cat(view, { cat: sec.cat });
      else view.innerHTML = '<div class="nx-empty">Ruta no encontrada.</div>';
    }
  } catch (err) {
    view.innerHTML = `<div class="nx-empty">Error al cargar el catálogo: ${esc(err.message)}<br>Servicio estático necesario (no funciona con file://).</div>`;
  }
}

/* ---------------- foco con teclado/mando (navegación espacial básica) ---------------- */
document.addEventListener('keydown', e => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const cur = document.activeElement;
  if (!cur || !cur.classList.contains('nx-card')) return;
  e.preventDefault();
  const cards = $$('.nx-card', cur.closest('.nx-row__track, .nx-grid') || document);
  const idx = cards.indexOf(cur);
  const delta = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (delta && cards[idx + delta]) cards[idx + delta].focus();
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const tracks = $$('.nx-row__track, .nx-grid');
    const ti = tracks.findIndex(t => t.contains(cur));
    const t2 = tracks[ti + (e.key === 'ArrowDown' ? 1 : -1)];
    if (t2) { const c = $$('.nx-card', t2)[Math.min(idx, $$('.nx-card', t2).length - 1)]; c && c.focus(); }
  }
});

/* ---------------- arranque ---------------- */
renderNav();
$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (q) location.hash = '#/buscar?q=' + encodeURIComponent(q);
});
window.addEventListener('hashchange', route);
route();
