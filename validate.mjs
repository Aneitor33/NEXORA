#!/usr/bin/env node
/* NEXORA — validate.mjs · Validación automática del índice canónico (Fase 8)
   Comprueba coherencia de manifest/shards/detalles y hace lookups de muestra.
   Uso: node scripts/validate.mjs [--out DIR]   → exit 0 = PASS, 1 = FAIL */
'use strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = (() => { const a = process.argv.slice(2); const i = a.indexOf('--out'); return i >= 0 ? a[i + 1] : 'public/data'; })();
const dName = id => id.replace(/[:|]/g, '_');
let pass = 0, fail = 0;
const ok = (cond, label) => { cond ? pass++ : fail++; console.log((cond ? '  ✅' : '  ❌') + ' ' + label); };
const read = f => JSON.parse(readFileSync(join(OUT, f), 'utf8'));

console.log(`\nNEXORA validate — ${OUT}\n`);
if (!existsSync(join(OUT, 'nx-manifest.json'))) { console.log('❌ nx-manifest.json no existe'); process.exit(1); }

const man = read('nx-manifest.json');
const c = man.conteos || {};

ok(!!man.generatedAt, 'manifest: generatedAt presente');
ok(!!man.detailsMode, `manifest: detailsMode = ${man.detailsMode}`);
ok(typeof c.canonicos_unicos === 'number' && c.canonicos_unicos > 0, `conteos: canonicos_unicos = ${c.canonicos_unicos}`);
ok(typeof c.records_originales === 'number', `conteos: records_originales = ${c.records_originales}`);
ok(Array.isArray(man.canonicalIds) && man.canonicalIds.every(x => x.st === 'gone'),
   `canonicalIds: solo tumbas (${man.canonicalIds.length})`);

/* shards */
const shardFiles = readdirSync(OUT).filter(f => /^nx-index-\d+\.json$/.test(f)).sort();
ok(shardFiles.length > 0, `shards: ${shardFiles.length} fichero(s)`);
let items = [], dupIds = 0, ofMismatch = 0;
const seen = new Set();
for (const f of shardFiles) {
  const s = read(f);
  if ((s.meta?.of || 1) !== shardFiles.length) ofMismatch++;
  for (const it of s.items || []) { if (seen.has(it.id)) dupIds++; seen.add(it.id); items.push(it); }
}
ok(ofMismatch === 0, 'shards: meta.of coincide en todos');
ok(dupIds === 0, `shards: sin ids duplicados (${items.length} ítems)`);
ok(items.every(i => i.id && i.t), 'shards: id+título presentes en todos los ítems');
const tomb = items.filter(i => i.st === 'gone').length;
ok(items.length - tomb === c.canonicos_unicos,
   `conteos: shards (${items.length} − ${tomb} retirados) == canonicos_unicos (${c.canonicos_unicos})`);

/* detalles: lookup de muestra */
const sample = [];
const step = Math.max(1, Math.floor(man.canonicalIds.length / 40));
for (let i = 0; i < man.canonicalIds.length; i += step) sample.push(man.canonicalIds[i].id);
let missing = 0, withEps = 0;
if (man.detailsMode === 'buckets') {
  const bucketCache = new Map();
  for (const id of sample) {
    const key = dName(id).replace(/^nx_(hash|tmdb)_/, '').slice(0, 2) || 'zz';
    if (!bucketCache.has(key)) {
      try { bucketCache.set(key, read(`nx-details-b-${key}.json`).items); }
      catch { bucketCache.set(key, {}); }
    }
    const d = bucketCache.get(key)[id];
    if (!d) missing++; else if (d.episodes?.length) withEps++;
  }
  const bucketCount = readdirSync(OUT).filter(f => /^nx-details-b-/.test(f)).length;
  ok(bucketCount > 1, `detalles: ${bucketCount} cubetas (modo buckets)`);
} else {
  for (const id of sample) {
    try { const d = read(`nx-details/${dName(id)}.json`); if (d.episodes?.length) withEps++; }
    catch { missing++; }
  }
}
ok(missing === 0, `detalles: ${sample.length} lookups de muestra, ${missing} faltantes`);
console.log(`  ℹ episodios con fuentes en la muestra: ${withEps}/${sample.length}`);

/* auxiliares */
for (const f of ['nx-sources.json', 'nx-review.json', 'nx-aliases.json']) ok(existsSync(join(OUT, f)), `auxiliar: ${f}`);
ok(existsSync(join(OUT, 'nx-report.json')), 'informe: nx-report.json');
try {
  const rev = read('nx-review.json');
  ok(Array.isArray(rev), `cola de revisión: ${rev.length} pares pendientes`);
} catch { ok(false, 'cola de revisión legible'); }

console.log(`\n${fail === 0 ? '✅ VALIDACIÓN SUPERADA' : '❌ VALIDACIÓN CON FALLOS'} — ${pass} comprobaciones OK, ${fail} fallos\n`);
process.exit(fail === 0 ? 0 : 1);
