/* NEXORA — functions/api/ai.js · Asistente IA (Fase 6)
   Cloudflare Pages Function. Claves SOLO en servidor (env vars / secretos del dashboard).
   Patrón auditado de DonghuaFlix: cadena de proveedores con fallback + rate limit +
   picks restringidos al catálogo real (nunca inventa títulos).
   Configuración (Settings → Environment variables, como SECRET): GEMINI_API_KEY y/o
   GROQ_API_KEY. Opcional: binding Workers AI llamado "AI". */
'use strict';

const DAILY_LIMIT = 40;
const TTL = 10 * 60 * 1000;
const hits = new Map(); // ip -> { day, n } (memoria por instancia; suficiente para Pages)
let cache = { at: 0, items: [] };

const SYSTEM = `Eres el asistente de NEXORA, plataforma de streaming. Respondes SIEMPRE en español.
Recibirás la lista REAL del catálogo (id, título, tipo, categoría, géneros, año).
REGLAS:
1. Recomienda SOLO títulos de esa lista. Nunca inventes títulos ni describas obras que no estén.
2. Devuelve SOLO JSON válido: {"picks":[{"id":"<id exacto>","reason":"1 frase corta"}], "reply":"<saludo breve opcional>"}
3. Máximo 8 picks. reason ≤ 120 caracteres, sin spoilers.
4. Si nada encaja, devuelve {"picks":[],"reply":"explicación breve + qué sí hay"}.
5. Modo conocimiento: si preguntan por algo fuera del catálogo, responde con "reply" y picks vacío.`;

async function catalog(origin) {
  if (Date.now() - cache.at < TTL && cache.items.length) return cache.items;
  const first = await (await fetch(`${origin}/public/data/nx-index-00.json`)).json();
  const of = first.meta?.of || 1;
  let items = [...first.items];
  for (let s = 1; s < of; s++)
    items.push(...(await (await fetch(`${origin}/public/data/nx-index-${String(s).padStart(2, '0')}.json`)).json()).items);
  items = items.filter(i => i.st !== 'gone');
  cache = { at: Date.now(), items };
  return items;
}
const limited = ip => {
  const day = new Date().toISOString().slice(0, 10);
  const h = hits.get(ip) || { day, n: 0 };
  if (h.day !== day) { h.day = day; h.n = 0; }
  h.n++; hits.set(ip, h);
  return h.n > DAILY_LIMIT;
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

async function askGemini(query, cat) { return askGeminiLike('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', process.env.GEMINI_API_KEY, query, cat, 'Gemini'); }
async function askGroq(query, cat) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.4,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMsg(query, cat) }] }),
  });
  if (!r.ok) throw new Error('groq ' + r.status);
  const d = await r.json();
  return { text: d.choices?.[0]?.message?.content || '', provider: 'Groq' };
}
function userMsg(query, cat) {
  const list = cat.slice(0, 4000).map(i => `${i.id} | ${i.t} | ${i.ty || ''} | ${i.cat || ''} | ${(i.g || []).join(',')} | ${i.y || ''}`).join('\n');
  return `CATÁLOGO (máx. 4000 títulos mostrados de ${cat.length}):\n${list}\n\nPETICIÓN DEL USUARIO: ${query}`;
}
async function askGeminiLike(url, key, query, cat, name) {
  const r = await fetch(`${url}?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM + '\n\n' + userMsg(query, cat) }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } }),
  });
  if (!r.ok) throw new Error(name + ' ' + r.status);
  const d = await r.json();
  return { text: d.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '', provider: name };
}
async function askWorkersAI(env, query, cat) {
  if (!env.AI?.run) throw new Error('sin binding AI');
  const r = await env.AI.run('@hf/thebloke/llama-2-13b-chat-awq', {
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMsg(query, cat) }],
  });
  return { text: r?.response || '', provider: 'Workers AI' };
}
function parsePicks(text, cat) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { picks: [], reply: text.slice(0, 300), _raw: true };
  try {
    const d = JSON.parse(m[0]);
    const ids = new Set(cat.map(i => i.id));
    const picks = (d.picks || []).filter(p => p && ids.has(p.id)).slice(0, 8)
      .map(p => ({ id: p.id, reason: String(p.reason || '').slice(0, 160) }));
    return { picks, reply: String(d.reply || '').slice(0, 400) };
  } catch { return { picks: [], reply: text.slice(0, 300), _raw: true }; }
}

export async function onRequestPost({ request, env, waitUntil }) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (limited(ip)) return json({ error: 'Límite diario de mensajes alcanzado. Vuelve mañana.' }, 429);
  let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const query = String(body.query || '').trim();
  if (!query || query.length > 500) return json({ error: 'Consulta vacía o demasiado larga (máx. 500 caracteres).' }, 400);

  const origin = new URL(request.url).origin;
  let cat; try { cat = await catalog(origin); } catch { return json({ error: 'Catálogo no disponible todavía (ejecuta build-index).' }, 503); }
  const brief = cat.map(i => ({ id: i.id, t: i.t, ty: i.ty, cat: i.cat, g: i.g, y: i.y }));

  const providers = [
    process.env.GEMINI_API_KEY ? (q, c) => askGemini(q, c) : null,
    process.env.GROQ_API_KEY ? (q, c) => askGroq(q, c) : null,
    env.AI ? (q, c) => askWorkersAI(env, q, c) : null,
  ].filter(Boolean);
  if (!providers.length) return json({ error: 'IA no configurada: añade GEMINI_API_KEY o GROQ_API_KEY como secreto del proyecto (Settings → Environment variables).' }, 503);

  for (const call of providers) {
    try {
      const { text, provider } = await call(query, brief);
      const parsed = parsePicks(text, cat);
      return json({ ...parsed, provider, catalogSize: cat.length });
    } catch (e) { /* siguiente proveedor */ }
  }
  return json({ error: 'Todos los proveedores de IA fallaron. Revisa las claves configuradas.' }, 502);
}
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
