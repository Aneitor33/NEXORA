# PARCHE de workflows — para que tus scrapers funcionen en NEXORA

Revisados tus 7 workflows + scrapers YA incorporados en Aneitor33/NEXORA. DonghuaFlix no se ha tocado. Todos fallan por el mismo motivo: los pasos de **empaquetado antiguos** (`split-catalog.js`, `shard-pack.js`, `build-master-index.js`) no existen en NEXORA (y varios hacen `npm install` sin `package.json`, que npm 10 rechaza). El importador `scripts/build-index.mjs` ya hace TODO ese empaquetado y más (índice canónico + validaciones). Los cambios son de 2-3 líneas por archivo — hazlos tú (mantienes el control de tus workflows).

## Cambio universal (todos los workflows)

Donde haya pasos que invoquen `split-catalog.js`, `shard-pack.js` o `build-master-index.js`, **sustitúyelos por un único paso**:
```
- name: Índice canónico NEXORA
  run: node scripts/build-index.mjs
```
Y en el `git add` final, añade también el estado (para detección de bajas entre sincronizaciones):
```
git add -A public/data/ import/state.json
```
Con el `package.json` que te entrego, los `npm install` dejan de fallar (instalan cheerio/express/node-cron que usan tus scrapers). Para Python: te entrego `requirements.txt` (el workflow `dramas-yt-sync` lo pide y no existía en el repo).

## Archivo a archivo

1. **pelispedia_auto.yml** → elimina los pasos 4 y 5 (`split-catalog.js`, `shard-pack.js catalog-pelispedia`, `build-master-index.js` y el `mv` de details); añade el paso único de arriba. En el commit final quita `catalog-pelispedia-index.json` de los paths (ya no se genera; el índice canónico es `nx-*`).
2. **donghualife-seriesdonghua.yml** → sustituye el paso "Generar índice lite + shards" (`node shard-pack.js catalog-donghualife full`) por el paso único.
3. **doramas.yml** → sustituye el paso `node split-catalog.js public/data/catalog-doramas.json` por el paso único. Necesitas el secreto **TMDB_API_KEY** en Settings → Secrets (ya lo usabas en DonghuaFlix; créalo también en NEXORA).
4. **dramas-yt-sync.yml** → el paso de empaquetado/commit apunta a `catalog-dramasyt-index.json` y details que ya no se generan: usa `git add -A public/data/ import/state.json`. Con `requirements.txt` entregado, el `pip install` ya tiene fichero.
5. **sync-youtubefilms.yml** → sustituye `node build-master-index.js` por el paso único.
6. **enrich-genres.yml** → llama a `node tools/enrich-genres.mjs`, **fichero que no copiaste** al repo. Cópialo tú desde DonghuaFlix (es tuyo); el importador ahora lo lee tanto de `import/` como de `public/data/`, así que la ruta actual del workflow vale.
7. **posters.yml** → su `node shard-pack.js`/`split-catalog.js` final, sustituir por el paso único. Además el matrix incluye catálogos que no existen en NEXORA (donghuaworld, peliculas, donghuacli): bórralos del matrix o el paso falla al no encontrar el JSON.

## Limpieza y avisos

- **Borra `.github/workflows/Jaja.js`** (fichero basura de 5 bytes; GitHub lo ignora, pero ensucia).
- **Falta la fuente donghuasub**: no copiaste su scraper/workflow a NEXORA. La demo la cubre por ahora; si quieres que se sincronice en NEXORA, incorpóralo como hiciste con los otros (o dime y te preparo la integración).
- **Secretos a crear en NEXORA** (Settings → Secrets and variables → Actions): los mismos que ya usas en DonghuaFlix (TMDB_API_KEY, YOUTUBE_API_KEY, credenciales de subida si las usas, y para la IA: GEMINI_API_KEY / GROQ_API_KEY como secreto del proyecto Pages, no del repo).
- **Fixtures**: borra de `import/` los ficheros `catalog-testlat.json` y `catalog-broken.json` antes de correr workflows reales (el importador los omite automáticamente por su marca, pero mejor limpio). Conserva `import/state.json` en el repo (lo añade el git add de arriba): es la memoria de detección de bajas.

## Secreto de la IA (Fase 6)

La función `functions/api/ai.js` lee `GEMINI_API_KEY` o `GROQ_API_KEY` del **entorno de Pages** (dashboard → NEXORA → Settings → Environment variables → Encrypt). Nunca del repo. Sin clave, el Asistente responde con un aviso honesto.
