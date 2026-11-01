#!/usr/bin/env node
// tools/enrich-genres.mjs — Enriquece los géneros del catálogo con APIs externas gratuitas.
//   · AniList (sin clave): donghua/anime → géneros + tags (Cultivation, Xianxia, Martial Arts…)
//   · TMDB  (clave gratuita, opcional): doramas y películas → géneros en español
// Escribe public/data/dfx-genres.json: { "<idOslug>": { "t": "<título>", "g": ["Cultivo", …] } }
//
// FIX-02 (2026-10-31): el descubrimiento buscaba `catalog-*-index.json` (formato antiguo
// de DonghuaFlix) y en NEXORA esos ficheros no existen → procesaba 0 catálogos. Ahora lee
// los catálogos COMPLETOS (catalog-*.json) y normaliza los dos esquemas de fila
// (lite {i,s,t} y completo {id,slug,title}). La salida va claveada por id/slug + título.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');
const OUT = path.join(DATA_DIR, 'dfx-genres.json');
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const SLEEP = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

const TAG_MAP = {
  'Cultivation': 'Cultivo', 'Martial Arts': 'Artes marciales', 'Xianxia': 'Xianxia',
  'Wuxia': 'Wuxia', 'Gods': 'Dioses', 'Mythology': 'Mitología', 'Historical': 'Histórico',
  'Military': 'Militar', 'Supernatural': 'Sobrenatural', 'Demons': 'Demonios'
};

function catalogFiles() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => /^catalog-.*\.json$/i.test(f))
    .filter(f => !/-(index|failures|progress|state|backup)/i.test(f) && !f.endsWith('.partial'))
    .map(f => path.join(DATA_DIR, f));
}

async function anilistBatch(titles) {
  const body = titles.map((t, i) =>
    `s${i}: Page(perPage:1){ media(search:${JSON.stringify(t.slice(0, 70))}, type:ANIME){ title{romaji english} genres tags{name rank} } }`).join('\n');
  for (let att = 0; att < 3; att++) {
    try {
      const r = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: `query { ${body} }` })
      });
      if (r.status === 429) { await SLEEP(2000); continue; }
      if (!r.ok) throw new Error('anilist ' + r.status);
      const j = await r.json();
      return titles.map((t, i) => j.data && j.data['s' + i] && j.data['s' + i].media && j.data['s' + i].media[0] || null);
    } catch (e) { if (att === 2) return titles.map(() => null); await SLEEP(1500); }
  }
  return titles.map(() => null);
}

function anilistGenres(m, wanted) {
  if (!m) return null;
  const mt = norm(m.title && (m.title.english || m.title.romaji));
  if (!mt || (mt !== wanted && !mt.includes(wanted) && !wanted.includes(mt))) return null;
  const g = (m.genres || []).slice(0, 6);
  for (const t of (m.tags || [])) {
    if ((t.rank || 0) >= 70 || /cultivation|xianxia|wuxia/i.test(t.name)) {
      const x = TAG_MAP[t.name] || t.name;
      if (g.indexOf(x) === -1) g.push(x);
    }
  }
  return g.length ? g : null;
}

let tmdbGenreNames = {};
async function tmdbGenres() {
  for (const type of ['tv', 'movie']) {
    try {
      const r = await fetch(`https://api.themoviedb.org/3/genre/${type}/list?api_key=${TMDB_KEY}&language=es-ES`);
      if (r.ok) { const j = await r.json(); for (const g of j.genres || []) tmdbGenreNames[g.id] = g.name; }
    } catch (e) { /* ignora */ }
  }
}

async function tmdbSearch(title, type) {
  for (let att = 0; att < 3; att++) {
    try {
      const r = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=es-ES&page=1`);
      if (r.status === 429) { await SLEEP(1200); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      return j.results && j.results[0] || null;
    } catch (e) { if (att === 2) return null; await SLEEP(1000); }
  }
  return null;
}

function tmdbGenresOf(item, wanted) {
  if (!item) return null;
  const it = norm(item.title || item.name);
  if (!it || (it !== wanted && !it.includes(wanted) && !wanted.includes(it))) return null;
  const g = (item.genre_ids || []).map(id => tmdbGenreNames[id]).filter(Boolean).slice(0, 6);
  return g.length ? g : null;
}

const isAnimeCat = f => /donghualife|donghua|anime|donghuasub/i.test(f);
const rowTitle = r => r.t ?? r.title ?? '';
const rowKey = r => String(r.s ?? r.slug ?? r.i ?? r.id ?? rowTitle(r));
const hasStringGenres = r => (r.g || r.genres || []).some(x => typeof (x && x.name ? x.name : x) === 'string' && isNaN(+x));

async function main() {
  const out = {};
  const files = catalogFiles();
  console.log('Catálogos encontrados:', files.length ? files.map(f => path.basename(f)).join(', ') : '(ninguno)');
  if (TMDB_KEY) await tmdbGenres();

  for (const f of files) {
    let cat;
    try { cat = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('saltando (JSON ilegible):', path.basename(f)); continue; }
    const rows = (cat.series || []).filter(r => rowTitle(r));
    const anime = isAnimeCat(path.basename(f));
    console.log(`\n== ${path.basename(f)}: ${rows.length} títulos (${anime ? 'AniList' : 'TMDB'})`);
    let matched = 0, skipped = 0;

    if (anime) {
      const BATCH = 8;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const results = await anilistBatch(chunk.map(rowTitle));
        chunk.forEach((r, k) => {
          if (hasStringGenres(r)) { skipped++; return; } // ya trae géneros textuales
          const g = anilistGenres(results[k], norm(rowTitle(r)));
          if (g) { out[rowKey(r)] = { t: rowTitle(r), g }; matched++; }
        });
        if (Math.floor(i / BATCH) % 10 === 0) console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length} (${matched} con género, ${skipped} ya tenían)`);
        await SLEEP(750); // límite AniList ~90 req/min
      }
    } else if (TMDB_KEY) {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (hasStringGenres(r)) { skipped++; continue; }
        const type = (r.contentType === 'movie' || r.ty === 'movie' || /peliculas|youtubefilms/i.test(f)) ? 'movie' : 'tv';
        const item = await tmdbSearch(rowTitle(r), type);
        const g = tmdbGenresOf(item, norm(rowTitle(r)));
        if (g) { out[rowKey(r)] = { t: rowTitle(r), g }; matched++; }
        if (i % 25 === 0) console.log(`  ${i + 1}/${rows.length} (${matched} con género, ${skipped} ya tenían)`);
        await SLEEP(60); // límite TMDB
      }
    } else {
      console.log('  (sin TMDB_API_KEY: se omite este catálogo)');
    }
    console.log(`  → ${matched} enriquecidos, ${skipped} ya tenían géneros`);
  }

  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log('\nEscrito', OUT, 'con', Object.keys(out).length, 'entradas');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
