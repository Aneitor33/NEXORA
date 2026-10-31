# NEXORA — Fases 8 y 9: validación automática y cierre de funciones

## Fase 8 — Validación automática (nuevo script)

`scripts/validate.mjs` convierte la validación en una comprobación ejecutable, no solo una lista:

```
node scripts/validate.mjs            # sobre public/data (por defecto)
node scripts/validate.mjs --out /ruta/al/indice
```

Verifica: coherencia de conteos (canónicos == canonicalIds), shards (meta.of, ids duplicados, campos obligatorios), **40 lookups de detalle aleatorios** (modo ficheros o cubetas según el manifest), ficheros auxiliares y cola de revisión. Sale con código 0 (PASS) o 1 (FAIL) — invocable tras cada sync (tú decides si lo añades como paso a tus workflows; yo no los toco).

Probadado contra el índice de estrés de 30k títulos: PASS completo.

## Fase 9 — Funciones de cierre

### Modo cine (paridad con DonghuaFlix)
Botón "Modo cine" en el reproductor: apaga el entorno (fondo negro + halo rojo suave alrededor del vídeo). Alternable.

### Géneros
- `#/generos`: todos los géneros confirmados con conteo de títulos → clic lleva a su vista.
- `#/genero/<g>`: rejilla filtrada paginada.
- Entrada en sidebar/topbar y en la navegación inferior del móvil.

### Novedades (cronología honesta)
`#/novedades`: "Actualizados esta semana", "Últimos 30 días" (por fecha de actualización/incorporación) y "Estrenos 2026/2025/2024" (por año de estreno — nunca mezclados).

### Sincronización entre dispositivos (opt-in, Firebase)
`assets/js/nx-sync.js` sincroniza Mi lista, Continuar viendo e Historial entre dispositivos vía **Firebase Realtime Database** (REST + auth anónima, sin SDK). Inactivo por completo hasta que configures:

1. Crea un proyecto en console.firebase.google.com (gratis) → Realtime Database → crear base (bloqueado por defecto).
2. Autenticación → Anónima → activar.
3. Reglas de Realtime Database:
   ```json
   { "rules": { "users": { "$uid": { ".read": "$uid === auth.uid", ".write": "$uid === auth.uid" } } } }
   ```
4. En `index.html`, justo antes de `<script src="assets/js/nx-sync.js">`:
   ```html
   <script>window.NX_SYNC_CONFIG = { apiKey: "…", databaseURL: "https://TU-PROYECTO.firebaseio.com" };</script>
   ```
   (La apiKey de Firebase en cliente es diseño estándar; la seguridad la dan las reglas. Aun así, úsala solo para esto.)
5. Sube y prueba: favorito en el móvil → aparece en el TV Box al abrir la app.

Resolución de conflictos: gana el dato con timestamp más reciente (pull solo si remoto > local; cada escritura marca ts).

### SEO
Meta OG/description en `index.html`. (Un sitemap de rutas hash no lo indexan los buscadores; el SEO real llegaría con prerender, decidido para más adelante si lo necesitas.)

## Estado del proyecto tras esta entrega

| Función (del documento maestro) | Estado |
|---|---|
| Catálogo central + dedup + conteos honestos | ✅ |
| Clasificación con evidencia (tipo/medio/cat/género/país/año/estado) | ✅ |
| Inicio dinámico, Explorar, fichas, cronología, géneros | ✅ |
| Reproducción multiservidor (servidores reales de tus scrapers) | ✅ |
| Continuar viendo, Mi lista, Historial | ✅ local · 🔶 multi-dispositivo (configurable) |
| Asistente IA (solo catálogo real, claves en servidor) | ✅ |
| PWA instalable + offline del shell | ✅ |
| Escalado probado a 30k títulos / 240k episodios | ✅ (4 s importación) |
| Validación automática post-sync | ✅ |
| Tus workflows de sync (los 7 que incorporaste) | 🔶 2 corregidos (yt fix) · 5 con parche de 2 líneas pendiente |
| DonghuaFlix en producción | ✅ intacto |

## Cierre
Cuando completes los 5 workflows restantes y pases `validate.mjs` sobre el índice real de las 6 fuentes, la Fase 8 queda cerrada con evidencia. La decisión final de apagado/migración de DonghuaFlix es tuya; NEXORA ya puede convivir con ella como plataforma independiente completa.
