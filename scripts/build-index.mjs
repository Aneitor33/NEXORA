#!/usr/bin/env node
/* NEXORA — build-index.mjs · Importador canónico (contrato v1.1 + addenda v2.1)
   Lee catálogos en "formato DonghuaFlix v1" (completo o índice lite) desde import/,
   valida integridad, normaliza, deduplica con umbrales numéricos y emite:
   public/data/nx-manifest.json · nx-index-NN.json · nx-sources.json ·
   nx-details/<id>.json · nx-review.json · nx-aliases.json · nx-report.json
   Sin dependencias. Uso: node scripts/build-index.mjs [--import-dir DIR] [--out DIR] */
'use strict';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const IMPORT_DIR = arg('--import-dir', 'import');
const OUT_DIR = arg('--out', 'public/data');
const FORCE = args.includes('--force'); // re-importar los mismos syncs (mantenimiento); no saltar las puertas de integridad 1/3/4/5
const SHARD_SIZE = 1500; // shards de índice mayores: menos peticiones al arrancar (30k ⇒ ~20 shards)

/* ---------------- configuración de normalización ---------------- */
const GENRE_MAP = {
  'acción':'accion','accion':'accion','aventura':'aventura','aventuras':'aventura',
  'romance':'romance','fantasía':'fantasia','fantasia':'fantasia','ciencia ficción':'ciencia-ficcion',
  'ciencia ficcion':'ciencia-ficcion','terror':'terror','comedia':'comedia','misterio':'misterio',
  'drama':'drama','suspenso':'suspenso','thriller':'suspenso','deportes':'deportes','deporte':'deportes',
  'histórico':'historico','historico':'historico','histórica':'historico','escolar':'escolar',
  'artes marciales':'artes-marciales','supervivencia':'supervivencia','animación':'animacion',
  'animacion':'animacion','música':'musica','musical':'musica','psicológico':'suspenso',
  'sobrenatural':'misterio','sobrenaturales':'misterio','guerra':'historico','histórico':'historico',
};
const STATUS_MAP = {
  'en emisión':'airing','en emision':'airing','emisión':'airing','emision':'airing',
  'finalizada':'finished','finalizado':'finished','finalizadas':'finished',
  'próximamente':'upcoming','proximamente':'upcoming','estreno':'upcoming',
};
const COUNTRY_MAP = {
  'china':'CN','corea del sur':'KR','corea':'KR','surcorea':'KR','japón':'JP','japon':'JP',
  'estados unidos':'US','usa':'US','eeuu':'US','méxico':'MX','mexico':'MX','españa':'ES','espana':'ES',
  'tailandia':'TH','taiwán':'TW','taiwan':'TW','filipinas':'PH','india':'IN','francia':'FR',
  'reino unido':'GB','uk':'GB','argentina':'AR','colombia':'CO','chile':'CL','perú':'PE','peru':'PE',
  'brasil':'BR','italia':'IT','alemania':'DE','turquía':'TR','turquia':'TR','indonesia':'ID','vietnam':'VN',
};
const CAT_ANIMATION = new Set(['anime','donghua','western-animation']);
/* Inferencia por fuente (evidencia 'inferred:source'): identidad del sitio origen */
const SOURCE_DEFAULTS = {
  donghuasub: { ty:'series', md:'animation', cat:'donghua' },
  donghuacli: { ty:'series', md:'animation', cat:'donghua' },
  donghualife:{ ty:'series', md:'animation', cat:'donghua' },
  doramas:    { ty:'series', md:'live',     cat:'dorama' },
  dramasyt:   { ty:'series', md:'live',     cat:'dorama' },
  youtubefilms:{ty:'movie',  md:null,       cat:'movie' },
  pelispedia: { ty:null,     md:null,       cat:null }, // por contentType/géneros/país
};

/* ---------------- utilidades ---------------- */
const norm = s => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const normTitle = s => norm(s).replace(/\s+/g, ' ');
const sha12 = str => createHash('sha1').update(str).digest('hex').slice(0, 12);
const isValidTitle = t => !!t && String(t).trim().length >= 2 && String(t).trim() !== '404';
function levRatio(a, b) {
  a = a || ''; b = b || '';
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}
const uniq = arr => [...new Set(arr)];

/* ---------------- clasificación ---------------- */
function mapGenres(genreNames, ev) {
  const g = [], unmapped = [];
  for (const name of genreNames || []) {
    const key = GENRE_MAP[norm(name)];
    if (key) g.push(key); else if (name && String(name).trim()) unmapped.push(name);
  }
  return { g: uniq(g), unmapped: uniq(unmapped) };
}
function mapStatus(st) {
  if (!st) return { v: 'unconfirmed', e: 'unconfirmed' };
  const k = STATUS_MAP[norm(st)];
  return k ? { v: k, e: 'stated' } : { v: 'unconfirmed', e: 'stated' }; // la fuente dice algo que no mapeamos
}
function mapCountry(c) {
  if (!c || !String(c).trim()) return { v: [], e: 'unconfirmed' };
  const parts = String(c).split(/[,/·|]+/).map(x => x.trim()).filter(Boolean);
  const iso = parts.map(p => COUNTRY_MAP[norm(p)] || ( /^[A-Z]{2}$/i.test(p) ? p.toUpperCase() : null ));
  if (iso.some(x => x === null)) return { v: [], e: 'unconfirmed' };
  return { v: uniq(iso), e: 'stated' };
}
function decideTipoCatMd(src, s, defaults, genres) {
  // ① explícito de la fuente ② default por sitio ③ regla país+medio ④ unconfirmed (addenda §6)
  const contentType = s.contentType === 'movie' ? 'movie' : s.contentType === 'series' ? 'series' : null;
  let ty = contentType || defaults.ty || null;
  if (!ty) {
    // heurística: si la fuente trae temporadas/episodios, es serie
    ty = (s.totalEpisodes > 1 || s.seasons) ? 'series' : 'movie';
  }
  const isAnim = genres.includes('animacion') || defaults.md === 'animation';
  let md = defaults.md || (isAnim ? 'animation' : (genres.length ? 'live' : null));
  let cat = defaults.cat;
  if (src === 'pelispedia' || src === 'youtubefilms' || !cat) {
    if (ty === 'movie') cat = 'movie';
    else if (isAnim) {
      const c = mapCountry(s.country ?? s.c).v;
      cat = c.includes('JP') ? 'anime' : c.includes('CN') ? 'donghua' : 'western-animation';
    }
    else cat = ty === 'series' ? 'live-series' : 'other';
  }
  if (md === null) md = 'unconfirmed';
  return { ty, md, cat: cat || 'unconfirmed' };
}

/* ---------------- IDs canónicos (addenda §1) ---------------- */
function canonicalId(s, ty, y, c) {
  const tmdb = s.tmdbId ?? s.tmdb_id ?? s.ids?.tmdb ?? null;
  if (tmdb) return { id: `nx:tmdb:${tmdb}`, aliasOf: null };
  const h = sha12([normTitle(s.title ?? s.t), ty || '', y ?? '', (c || []).join(',')].join('|'));
  return { id: `nx:hash:${h}`, aliasOf: null };
}

/* ---------------- normalización de servidores (H1 / addenda §3) ---------------- */
function normServers(servers, stats) {
  const out = [];
  for (const s of servers || []) {
    const embedIsUrl = typeof s.embed === 'string' && s.embed.trim().length > 0;
    const src = embedIsUrl ? s.embed.trim() : (s.url || '').trim();
    if (!src) { stats.serversEmpty++; continue; }
    if (embedIsUrl) stats.variantA++; else stats.variantB++;
    const lang = ['latino','castellano','subtitulado'].includes(s.lang) ? s.lang : null;
    const entry = { name: s.name || '', src, lang };
    if (!embedIsUrl && s.url) entry.pageUrl = s.url;
    else if (s.url) entry.pageUrl = s.url;
    out.push(entry);
  }
  const seen = new Set();
  return out.filter(x => (seen.has(x.src) ? false : (seen.add(x.src), true)));
}

/* ---------------- puertas de integridad (addenda §4) ---------------- */
function runGates(tag, data, prev, report) {
  const reasons = [];
  const items = Array.isArray(data.series) ? data.series : [];
  const meta = data.meta || {};
  if (!meta.catalogTag && !data.lite) reasons.push('meta.catalogTag ausente');
  if (items.length === 0) reasons.push('catálogo sin entradas (series vacío)');
  const declared = meta.items ?? meta.series ?? (data.count || null);
  if (declared && Math.abs(items.length - declared) / declared > 0.05)
    reasons.push(`conteo discrepante: meta declara ${declared}, hay ${items.length}`);
  const valid = items.filter(e => e && (e.id ?? e.i) && isValidTitle(e.title ?? e.t)).length;
  if (items.length && valid / items.length < 0.95)
    reasons.push(`entradas con id+título válidos: ${(valid / items.length * 100).toFixed(1)}% < 95%`);
  if (!data.lite && Array.isArray(data.episodes)) {
    const sids = new Set(items.map(e => String(e.id ?? e.i)));
    const ok = data.episodes.filter(ep => sids.has(String(ep.seriesId))).length;
    if (data.episodes.length && ok / data.episodes.length < 0.99)
      reasons.push(`episodios con seriesId resoluble: ${(ok / data.episodes.length * 100).toFixed(1)}% < 99%`);
  }
  if (!FORCE && prev && prev.ids && items.length) {
    const gone = prev.ids.filter(id => !items.some(e => String(e.id ?? e.i) === id)).length;
    if (gone / prev.ids.length > 0.2)
      reasons.push(`desaparición masiva: ${(gone / prev.ids.length * 100).toFixed(1)}% > 20% (sync incompleto)`);
  }
  if (!FORCE && prev && meta.syncedAt && prev.syncedAt && meta.syncedAt <= prev.syncedAt)
    reasons.push(`syncedAt (${meta.syncedAt}) no es posterior al anterior (${prev.syncedAt})`);
  return { ok: reasons.length === 0, reasons };
}

/* ---------------- dedup (addenda §2): pesos y umbrales ---------------- */
const W = { TMDB: 1000, TITLE_EXACT: 40, TITLE_090: 25, TITLE_080: 15, YEAR: 20, YEAR_PM1: 10, TYPE: 10, COUNTRY: 10, EPS: 5 };
const TH_AUTO = 85, TH_REVIEW = 55; // <55 = distintos
function scorePair(a, b) {
  if (a.tmdb && b.tmdb && a.tmdb === b.tmdb)
    return { score: W.TMDB, signals: ['tmdb'], veto: null };
  let score = 0; const signals = []; let veto = null;
  const ta = normTitle(a.t), tb = normTitle(b.t);
  const altMatch = (a.alt || []).some(x => normTitle(x) === tb) || (b.alt || []).some(x => normTitle(x) === ta);
  if (ta === tb || altMatch) { score += W.TITLE_EXACT; signals.push('título exacto'); }
  else { const r = levRatio(ta, tb); if (r >= 0.9) { score += W.TITLE_090; signals.push(`título ~${r.toFixed(2)}`); } else if (r >= 0.8) { score += W.TITLE_080; signals.push(`título ~${r.toFixed(2)}`); } }
  if (a.y && b.y) { if (a.y === b.y) { score += W.YEAR; signals.push('año igual'); } else if (Math.abs(a.y - b.y) === 1) { score += W.YEAR_PM1; signals.push('año ±1'); } }
  if (a.ty && b.ty) { if (a.ty === b.ty) { score += W.TYPE; signals.push('tipo igual'); } else veto = 'tipo distinto'; }
  if (a.c.length && b.c.length) { if (a.c.some(x => b.c.includes(x))) { score += W.COUNTRY; signals.push('país coincide'); } else if (a.c.length === 1 && b.c.length === 1) veto = 'país distinto'; }
  if (a.ty === 'series' && a.e && b.e && a.e === b.e) { score += W.EPS; signals.push('episodios igual'); }
  return { score, signals, veto };
}
class UF {
  constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(x) { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
  union(a, b) { this.p[this.find(a)] = this.find(b); }
}

/* ---------------- enriquecimiento de géneros (dfx-genres) ---------------- */
function loadEnrichment() {
  const f = [join(IMPORT_DIR, 'dfx-genres.json'), join(OUT_DIR, 'dfx-genres.json')].find(existsSync);
  if (!f) return { map: new Map(), shape: 'ausente' };
  try {
    const d = JSON.parse(readFileSync(f, 'utf8'));
    const map = new Map();
    if (Array.isArray(d)) for (const e of d) { if (e && (e.title || e.t)) map.set(normTitle(e.title || e.t), e.genres || e.g || []); }
    else if (d && typeof d === 'object') for (const [k, v] of Object.entries(d)) map.set(normTitle(k), Array.isArray(v) ? v : [v]);
    return { map, shape: Array.isArray(d) ? 'array' : 'object' };
  } catch { return { map: new Map(), shape: 'ilegible' }; }
}

/* ---------------- main ---------------- */
const stateFile = join(IMPORT_DIR, 'state.json');
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { sources: {} };
const prevManifestFile = join(OUT_DIR, 'nx-manifest.json');
const prevManifest = existsSync(prevManifestFile) ? JSON.parse(readFileSync(prevManifestFile, 'utf8')) : null;

/* escaneo dual: public/data/ (donde escriben los scrapers en CI) + import/ (descargas locales).
   Sin duplicados por tag: gana el primero encontrado (public/data tiene prioridad). */
const files = [
  ...(existsSync(OUT_DIR) ? readdirSync(OUT_DIR).filter(f => /^catalog-.*\.json$/i.test(f) && !f.endsWith('-index.json')).map(f => join(OUT_DIR, f)) : []),
  ...readdirSync(IMPORT_DIR).filter(f => /^catalog-.*\.json$/i.test(f) && !f.endsWith('-index.json')).map(f => join(IMPORT_DIR, f)),
];
const sources = [], report = { generatedAt: new Date().toISOString(), sources: {}, conteos: {}, rechazados: [] };
const records = []; // {rec, tag, srcId, raw}

const seenTags = new Set();
for (const path of files) {
  const file = basename(path);
  let data; try { data = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { report.rechazados.push({ file, reasons: ['JSON ilegible: ' + e.message] }); continue; }
  if (data._note && /FIXTURE/i.test(data._note)) { report.sources[basename(file, '.json')] = { file, estado: 'OMITIDO (fixture de prueba)' }; continue; }
  const lite = !!(data.lite || data.compact);
  const tag = data.meta?.catalogTag || basename(file, '.json').replace(/^catalog-/, '');
  if (seenTags.has(tag)) { report.sources[tag + ' (duplicado)'] = { file, estado: 'OMITIDO (tag ya procesado desde otra ruta)' }; continue; }
  seenTags.add(tag);
  const prev = state.sources[tag] || null;
  const gates = runGates(tag, data, prev, report);
  const entry = { tag, file, lite, declared: data.meta?.items ?? data.count ?? null, actual: Array.isArray(data.series) ? data.series.length : 0, syncedAt: data.meta?.syncedAt || null };
  if (!gates.ok) {
    report.rechazados.push({ tag, file, reasons: gates.reasons });
    report.sources[tag] = { ...entry, estado: 'RECHAZADO', reasons: gates.reasons };
    continue; // se conserva el snapshot previo (state); nada se marca como desaparecido
  }
  sources.push({ tag, data, lite });
  report.sources[tag] = { ...entry, estado: 'ACEPTADO' };
}

/* saturasión de géneros por fuente (H5): género presente en >95% de las entradas → se igneda de esa fuente */
const stats_genreSat = new Map();
for (const { tag, data, lite } of sources) {
  const items = data.series || [];
  const genreList = data.genres || [];
  const freq = new Map(); let withGenres = 0;
  for (const e of items) { const g = e.g || e.genres || []; if (g.length) withGenres++; for (const gi of new Set(g.map(Number))) freq.set(gi, (freq.get(gi) || 0) + 1); }
  const saturated = [...freq.entries()].filter(([, n]) => n / items.length > 0.95).map(([gi]) => genreList[gi] ?? `#${gi}`);
  stats_genreSat.set(tag, { saturated, withGenresPct: items.length ? withGenres / items.length : 0 });
}

/* ---------------- construcción de registros canónicos ---------------- */
const enrichment = loadEnrichment();
const unmappedGenres = new Map(); // tag -> Set
let invalidTitles = 0;
for (const { tag, data, lite } of sources) {
  const defaults = SOURCE_DEFAULTS[tag] || { ty: null, md: null, cat: null };
  const genreList = data.genres || [];
  const sat = stats_genreSat.get(tag);
  const episodes = lite ? [] : (data.episodes || []);
  const seasons = lite ? [] : (data.seasons || []);
  /* índices por seriesId: O(1) por serie. El filter() anterior era O(series × episodes):
     con 20k series y 300k episodios se colgaba horas. */
  const epMap = new Map(), seaMap = new Map();
  for (const ep of episodes) { const k = String(ep.seriesId); if (!epMap.has(k)) epMap.set(k, []); epMap.get(k).push(ep); }
  for (const s of seasons)   { const k = String(s.seriesId); if (!seaMap.has(k)) seaMap.set(k, []); seaMap.get(k).push(s); }
  const stats = { serversEmpty: 0, variantA: 0, variantB: 0 };
  for (const e of data.series || []) {
    const title = e.title ?? e.t ?? '';
    if (!isValidTitle(title)) { invalidTitles++; continue; } // se detecta y omite (entra en informe)
    const srcId = String(e.id ?? e.i ?? '');
    const rawGenres = (e.g || e.genres || []).map(Number).filter(n => !isNaN(n)).map(gi => genreList[gi]).filter(Boolean);
    const { g, unmapped } = mapGenres(rawGenres.filter(name => !sat.saturated.includes(name)), null);
    if (!unmappedGenres.has(tag)) unmappedGenres.set(tag, new Set());
    for (const u of unmapped) unmappedGenres.get(tag).add(u);
    // enriquecimiento solo si la fuente no aporta géneros utilizables (H5)
    let finalG = g, gEv = g.length ? 'stated' : 'unconfirmed';
    if (!finalG.length && enrichment.map.size) {
      const enr = enrichment.map.get(normTitle(title));
      if (enr && enr.length) { const m = mapGenres(enr); if (m.g.length) { finalG = m.g; gEv = 'inferred:enrichment'; for (const u of m.unmapped) unmappedGenres.get(tag).add(u); } }
    }
    const country = mapCountry(e.country ?? e.c);
    const y = (e.year ?? e.y) || null;
    const st = mapStatus(e.status ?? e.st);
    const { ty, md, cat } = decideTipoCatMd(tag, { ...e, contentType: e.contentType }, defaults, finalG);
    let p = e.image ?? (e.p && data.imageBase ? data.imageBase + e.p : e.p) ?? null;
    if (p && /^\//.test(p) && data.imageBase) p = data.imageBase + p;
    else if (p && /^\//.test(p)) p = null; // ruta relativa no resoluble (H6): null + contabilizar
    const epCount = e.totalEpisodes ?? e.e ?? null;
    const { id } = canonicalId({ title, tmdbId: e.tmdbId ?? e.tmdb_id, ids: e.ids }, ty, y, country.v);
    const eps = (epMap.get(srcId) || []).slice().sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const seas = (seaMap.get(srcId) || []).slice().sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    records.push({
      rec: {
        id, t: title, alt: [], ty, md, cat, g: finalG, pub: 'unconfirmed',
        c: country.v, y, st: st.v, fmt: null, e: epCount, p,
        dates: { release: null, added: data.meta?.syncedAt || null, updated: e.updatedAt ?? e.u ?? null },
        ev: { ty: 'stated', md: defaults.md ? 'inferred:source' : (md === 'unconfirmed' ? 'unconfirmed' : 'inferred:rule'), cat: defaults.cat ? 'inferred:source' : 'inferred:rule', g: gEv, c: country.e, y: y ? 'stated' : 'unconfirmed', st: st.e },
        src: [{ tag, id: srcId }],
      },
      tag, srcId, raw: e, lite,
      seasons: seas.map(s => ({ id: String(s.id), number: s.number ?? null, episodes: s.episodeCount ?? null })),
      episodes: eps.map(ep => ({
        id: String(ep.id), number: ep.number ?? null, title: ep.title || '',
        src: ep.sourceUrl || null, updatedAt: ep.updatedAt ?? null, releaseDate: ep.releaseDate || null,
        servers: normServers(ep.servers, stats),
      })),
      stats,
    });
  }
  report.sources[tag].generosSinMapear = [...(unmappedGenres.get(tag) || [])];
  report.sources[tag].generosSaturadosIgnorados = sat.saturated;
  report.sources[tag].servidores = { ...stats };
  report.sources[tag].conGeneresPct = +(sat.withGenresPct * 100).toFixed(1);
}

const review = []; // cola de revisión (colisiones de hash + pares dudosos del dedup)
/* colisiones REALES de hash (mismo ID, contenido distinto → NO fusionar; sufijo + revisión).
   Mismo contenido desde otra fuente NO toca el ID: lo resuelve el dedup con sus umbrales. */
const byId = new Map(); const aliases = {};
for (const r of records) {
  const prev = byId.get(r.rec.id);
  if (!prev) { byId.set(r.rec.id, r); continue; }
  const same = normTitle(prev.rec.t) === normTitle(r.rec.t) && prev.rec.y === r.rec.y && prev.rec.ty === r.rec.ty && prev.rec.c.join() === r.rec.c.join();
  if (same) continue;
  const key = [prev.tag + ':' + prev.srcId, r.tag + ':' + r.srcId].sort().join('<');
  const newId = r.rec.id + '-c2';
  aliases[newId] = { collisionOf: r.rec.id, pair: key };
  r.rec.id = newId; byId.set(newId, r);
  review.push({ ids: [prev.rec.id, newId], score: null, signals: ['colisión de hash'], veto: null, t: [prev.rec.t, r.rec.t], fuentes: [prev.tag, r.tag] });
}

/* ---------------- dedup en dos pasadas ---------------- */
/* P1: mismo ID canónico = mismo contenido (título|tipo|año|país idénticos tras normalizar).
   No es "fusión por título": es identidad por hash. Un solo registro canónico. */
const idGroups = new Map();
for (const r of records) { const k = r.rec.id; if (!idGroups.has(k)) idGroups.set(k, []); idGroups.get(k).push(r); }
const preGroups = [...idGroups.values()];
let sameHashMerges = 0;
for (const m of preGroups) sameHashMerges += m.length - 1;

/* P2: candidatos entre IDs DISTINTOS (mismo título normalizado) → umbrales numéricos addenda §2 */
const buckets = new Map();
preGroups.forEach((members, gi) => {
  const rep = members[0].rec;
  const keys = new Set([normTitle(rep.t), ...(rep.alt || []).map(normTitle)].filter(Boolean));
  for (const k of keys) { if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(gi); }
});
const uf = new UF(preGroups.length);
let autoPairs = 0;
for (const [, gis] of buckets) {
  if (gis.length < 2) continue;
  for (let i = 0; i < gis.length; i++) for (let j = i + 1; j < gis.length; j++) {
    const RA = preGroups[gis[i]][0], RB = preGroups[gis[j]][0];
    const A = RA.rec, B = RB.rec;
    if (A.id === B.id) continue;
    const { score, signals, veto } = scorePair(A, B);
    if (score >= TH_AUTO && !veto && signals.some(s => s.startsWith('título'))) { uf.union(gis[i], gis[j]); autoPairs++; }
    else if (score >= TH_REVIEW)
      review.push({ ids: [A.id, B.id], score, signals, veto: veto || null, t: [A.t, B.t], fuentes: [RA.tag, RB.tag] });
  }
}
/* canónicos finales */
const finalGroups = new Map();
preGroups.forEach((members, gi) => { const root = uf.find(gi); if (!finalGroups.has(root)) finalGroups.set(root, []); finalGroups.get(root).push(...members); });
const canonical = [];
for (const [, members] of finalGroups) {
  const base = [...members].sort((a, b) => (b.rec.src.length - a.rec.src.length) || a.rec.id.localeCompare(b.rec.id))[0].rec;
  const merged = { ...base };
  merged.src = members.flatMap(m => m.rec.src);
  merged.alt = uniq(members.flatMap(m => m.rec.alt || []));
  for (const f of ['p', 'y', 'c', 'e']) // mejorar con el miembro más informativo
    if ((merged[f] === null || (Array.isArray(merged[f]) && !merged[f].length)) && members.some(m => m.rec[f] !== null && (!Array.isArray(m.rec[f]) || m.rec[f].length))) {
      const best = members.find(m => m.rec[f] !== null && (!Array.isArray(m.rec[f]) || m.rec[f].length));
      merged[f] = best.rec[f];
      if (merged.ev && best.rec.ev) merged.ev[f] = best.rec.ev[f];
    }
  merged._members = members;
  canonical.push(merged);
}
const absorbed = preGroups.length - finalGroups.size; // grupos absorbidos por fusión automática entre IDs

/* ---------------- bajas con gracia (30 días) vs manifest previo ---------------- */
const now = Date.now();
if (prevManifest?.canonicalIds) {
  const current = new Set(canonical.map(c => c.id));
  const prevById = new Map((prevManifest.canonicalIds || []).map(x => [x.id, x]));
  for (const [id, prev] of prevById) {
    if (current.has(id)) continue;
    const goneSince = prev.goneSince || now;
    if (now - goneSince > 30 * 864e5) continue; // fuera de gracia: se retira del índice
    canonical.push({ id, t: prev.t, ty: prev.ty, md: prev.md, cat: prev.cat, g: prev.g || [], pub: 'unconfirmed', c: prev.c || [], y: prev.y ?? null, st: 'gone', fmt: null, e: prev.e ?? null, p: prev.p ?? null, dates: prev.dates || { release: null, added: null, updated: null }, ev: {}, src: prev.src || [], _tombstone: true, _goneSince: goneSince });
  }
}

/* ---------------- salidas ---------------- */
mkdirSync(OUT_DIR, { recursive: true });
canonical.sort((a, b) => a.id.localeCompare(b.id));
/* Detalles: ficheros sueltos (<4000 títulos) o cubetas por prefijo (escala 30k+).
   El límite de 20 000 archivos de Cloudflare Pages lo prohibiría uno-a-uno.
   Clave determinista: 2 primeros caracteres de id.replace(/[:|]/g,'_') → ~256 cubetas. */
const dName = c => c.id.replace(/[:|]/g, '_');
const USE_BUCKETS = canonical.length > 4000;
const detailPayload = c => {
  const d = { ...c }; delete d._members;
  if (c._members) {
    const eps = c._members.flatMap(m => m.episodes), seas = c._members.flatMap(m => m.seasons);
    if (eps.length || seas.length) { d.seasons = seas; d.episodes = eps; }
  }
  delete d._tombstone;
  return d;
};
const shardCount = Math.max(1, Math.ceil(canonical.length / SHARD_SIZE));
for (let s = 0; s < shardCount; s++) {
  const part = canonical.slice(s * SHARD_SIZE, (s + 1) * SHARD_SIZE)
    .map(c => ({ id: c.id, t: c.t, ty: c.ty, md: c.md, cat: c.cat, g: c.g, c: c.c, y: c.y, st: c.st, e: c.e, p: c.p, u: c.dates.updated, src: c.src.length }));
  writeFileSync(join(OUT_DIR, `nx-index-${String(s).padStart(2, '0')}.json`), JSON.stringify({ meta: { shard: s, of: shardCount, generatedAt: report.generatedAt }, items: part }));
}
if (USE_BUCKETS) {
  const buckets = new Map();
  for (const c of canonical) {
    const key = dName(c).replace(/^nx_(hash|tmdb)_/, '').slice(0, 2) || 'zz';
    if (!buckets.has(key)) buckets.set(key, {});
    buckets.get(key)[c.id] = detailPayload(c);
  }
  for (const [key, items] of [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    writeFileSync(join(OUT_DIR, `nx-details-b-${key}.json`), JSON.stringify({ meta: { bucket: key, of: buckets.size, generatedAt: report.generatedAt }, items }));
  console.log(`Detalles en modo cubetas: ${buckets.size} ficheros (media ${(canonical.length / buckets.size).toFixed(0)} títulos/cubeta)`);
} else {
  mkdirSync(join(OUT_DIR, 'nx-details'), { recursive: true });
  for (const c of canonical)
    writeFileSync(join(OUT_DIR, 'nx-details', `${dName(c)}.json`), JSON.stringify(detailPayload(c)));
}
writeFileSync(join(OUT_DIR, 'nx-sources.json'), JSON.stringify(canonical.map(c => ({ id: c.id, src: c.src }))));
writeFileSync(join(OUT_DIR, 'nx-review.json'), JSON.stringify(review, null, 2));
writeFileSync(join(OUT_DIR, 'nx-aliases.json'), JSON.stringify(aliases, null, 2));
const manifest = {
  generatedAt: report.generatedAt,
  sources: sources.map(s => s.tag),
  detailsMode: USE_BUCKETS ? 'buckets' : 'files',
  conteos: {
    records_originales: records.length, // todos los registros aceptados (antes de dedup)
    aceptados_por_fuente: Object.fromEntries(Object.entries(report.sources).map(([k, v]) => [k, v.actual])),
    matches_entre_fuentes: review.length,
    fusiones_automaticas: autoPairs,
    mismos_hash_unificados: sameHashMerges,
    absorbidos_por_fusion: absorbed,
    canonicos_unicos: canonical.filter(c => c.st !== 'gone').length,
    pendientes_revision: review.length,
    rechazados: report.rechazados.length,
  },
  canonicalIds: canonical.map(c => ({ id: c.id, t: c.t, st: c.st, src: c.src, goneSince: c._goneSince || (c.st === 'gone' ? now : undefined), dates: c.dates })),
};
writeFileSync(join(OUT_DIR, 'nx-manifest.json'), JSON.stringify(manifest, null, 2));
report.conteos = manifest.conteos;
report.titulosInvalidosOmitidos = invalidTitles;
report.enriquecimiento = { shape: enrichment.shape, entries: enrichment.map.size };
writeFileSync(join(OUT_DIR, 'nx-report.json'), JSON.stringify(report, null, 2));
/* estado para la próxima importación */
for (const { tag, data } of sources)
  state.sources[tag] = { syncedAt: data.meta?.syncedAt || null, count: (data.series || []).length, ids: (data.series || []).map(e => String(e.id ?? e.i)) };
state.updatedAt = report.generatedAt;
writeFileSync(stateFile, JSON.stringify(state, null, 2));

console.log('✔ Importación completa');
console.log(JSON.stringify(manifest.conteos, null, 2));
console.log(`Índice: ${shardCount} shard(s) · detalles: ${canonical.length} · revisión: ${review.length} · rechazados: ${report.rechazados.length}`);
