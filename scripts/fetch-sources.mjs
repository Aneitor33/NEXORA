#!/usr/bin/env node
/* NEXORA — fetch-sources.mjs · Descarga los catálogos activos de DonghuaFlix (solo lectura)
   hacia import/ para alimentar build-index.mjs. No modifica DonghuaFlix.
   Uso: node scripts/fetch-sources.mjs [tag …]   (sin argumentos: las 6 activas + dfx-genres) */
'use strict';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'https://raw.githubusercontent.com/Aneitor33/donghuaflix/main/public/data';
const SOURCES = {
  donghuasub:   'catalog-donghuasub.json',
  donghualife:  'catalog-donghualife.json',
  doramas:      'catalog-doramas.json',
  dramasyt:     'catalog-dramasyt.json',
  youtubefilms: 'catalog-youtubefilms.json',
  pelispedia:   'catalog-pelispedia.json',
  dfxgenres:    'dfx-genres.json',
};
const IMPORT_DIR = 'import';
mkdirSync(IMPORT_DIR, { recursive: true });

const wanted = process.argv.slice(2);
const entries = Object.entries(SOURCES).filter(([tag]) => !wanted.length || wanted.includes(tag));
if (!entries.length) { console.error('Tags válidos:', Object.keys(SOURCES).join(', ')); process.exit(1); }

for (const [tag, file] of entries) {
  const dest = join(IMPORT_DIR, file === 'dfx-genres.json' ? 'dfx-genres.json' : file);
  const url = `${BASE}/${file}`;
  try {
    process.stdout.write(`↓ ${tag} … `);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    const mb = (buf.length / 1048576).toFixed(1);
    // aviso de puerta 3: el importador rechaza si meta declara un conteo muy distinto
    try {
      const head = JSON.parse(buf.toString('utf8', 0, Math.min(buf.length, 200000)));
      const declared = head.meta?.items ?? head.meta?.series ?? head.count ?? null;
      const actual = Array.isArray(head.series) ? head.series.length : null;
      if (declared && actual !== null && Math.abs(actual - declared) / declared > 0.05)
        console.log(`${mb} MB ⚠️  cabecera incompleta en los primeros 200 KB (JSON grande); la puerta de integridad lo validará entero.`);
      else console.log(`${mb} MB ✔`);
    } catch { console.log(`${mb} MB ✔ (meta no verificada en prelectura)`); }
  } catch (e) { console.log(`FALLO: ${e.message}`); }
}
console.log('\nSiguiente paso: node scripts/build-index.mjs');
