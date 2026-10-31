# NEXORA — Fase 7-8: validación de la integración y del producto

## Fase 7 — Integración de tus scrapers (estado)

El ciclo completo es: **tu workflow scrapea → escribe public/data/catalog-*.json → build-index.mjs valida y unifica → la web consume nx-***.

Checklist por workflow (marca conforme los pruebes con "Run workflow"):

| Workflow | Problema encontrado | Corrección entregada | Estado |
|---|---|---|---|
| Sync YouTube Films | Falta el secreto YOUTUBE_API_KEY en NEXORA | Crear el secreto (Settings → Secrets). Además: si el paso "Reconstruir índice maestro" llama a `build-master-index.js`, cambiarlo por `node scripts/build-index.mjs` | ⬜ |
| dramas-yt sync | `requirements.txt` sin yt-dlp (lista 0 playlists) + git add con pathspec | requirements corregido + workflow reconstruido (este ZIP) | ✅ listo |
| Pelispedia Scraper | Pasos 4-5 llaman a split-catalog/shard-pack/build-master-index (no existen) | Sustituir por `node scripts/build-index.mjs` (PARCHE-WORKFLOWS.md §1) | ⬜ |
| Sincronizar SeriesDonghua | Paso `shard-pack.js` no existe | Igual: paso único build-index.mjs | ⬜ |
| Sincronizar catálogo Doramas | Paso `split-catalog.js` no existe + TMDB_API_KEY | build-index.mjs + crear secreto TMDB_API_KEY | ⬜ |
| Sincronizar portadas | Matrix con catálogos ausentes + shard-pack | Limitar matrix a catálogos existentes + build-index.mjs | ⬜ |
| Enrich genes | `tools/enrich-genres.mjs` no copiado | Copiar ese fichero desde DonghuaFlix (es tuyo) | ⬜ |

Secretos a crear en NEXORA (Settings → Secrets and variables → Actions): `YOUTUBE_API_KEY`, `TMDB_API_KEY` (los mismos valores que ya usas en DonghuaFlix).

## Fase 8 — Validación función a función (ejecutar tras el primer sync completo)

### Datos
- [ ] `nx-report.json`: 6 fuentes ACEPTADAS, 0 rechazadas (o rechazo justificado)
- [ ] Conteos honestos: records ≠ únicos; únicos = records − fusiones
- [ ] `nx-review.json`: revisar los pares dudosos y decidir (aceptar = añadir a un futuro `nx-aliases.json` manual)
- [ ] Puerta anti-desastre: simular un sync incompleto (matar un workflow a mitad) → re-importar → nada marcado como "gone"

### Web (comparativa con donghuaflix.pages.dev)
- [ ] Inicio: banner + 7+ filas dinámicas con datos reales
- [ ] Películas/Doramas llenas (antes vacías)
- [ ] Ficha: temporadas, episodios, servidores por idioma
- [ ] Reproductor: reproduce un episodio real de cada fuente (pelispedia, dramasyt con YouTube, donghuasub)
- [ ] Continuar viendo + Mi lista + Historial persisten tras recargar
- [ ] Búsqueda parcial funciona (probar "apocalypse", "youku")
- [ ] Explorar: filtros combinables devuelven resultados coherentes
- [ ] IA: con secreto configurado, recomienda solo títulos reales del catálogo (probar: "algo de fantasía con romance")
- [ ] PWA: instalar en el móvil; abrir offline muestra el shell

### Dispositivos
- [ ] Chrome Android (móvil)
- [ ] Firefox Android
- [ ] TV Box 1-2 GB (navegador): arranque < 5 s, filas deslizables con mando, sin cuelgues
- [ ] Escritorio Firefox + Chrome
- [ ] Tablet

### Regla de cierre
Ninguna función se da por migrada hasta tener su casilla marcada con evidencia. DonghuaFlix sigue intacto y operativo durante todo el proceso.
