/* NEXORA — nx-sync.js · Sincronización de biblioteca entre dispositivos (opt-in)
   Firebase Realtime Database vía REST + auth anónima con RENOVACIÓN de token.
   FIX-05 (2026-10-31): pull() ahora va autenticado (?auth=token) y el idToken se
   renueva automáticamente vía refresh_token (el uid es estable; no se pierden datos).
   Inactivo hasta que configures window.NX_SYNC_CONFIG (ver FASE-9-CIERRE.md). */
'use strict';
window.NXSync = (() => {
  const cfg = window.NX_SYNC_CONFIG; // { apiKey, databaseURL }
  const LIBKEY = 'nx.lib.v1', UID = 'nx.sync.uid', TOK = 'nx.sync.tok', REF = 'nx.sync.ref', EXP = 'nx.sync.exp', TS = 'nx.sync.ts';
  let pushing = null;
  const ready = () => !!(cfg && cfg.apiKey && cfg.databaseURL);
  const store = (uid, id, ref, exp) => { localStorage.setItem(UID, uid); localStorage.setItem(TOK, id); localStorage.setItem(REF, ref); localStorage.setItem(EXP, String(exp)); };

  async function signup() {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
    });
    if (!r.ok) throw new Error('auth ' + r.status);
    const d = await r.json();
    store(d.localId, d.idToken, d.refreshToken, Date.now() + (+d.expiresIn || 3600) * 1000);
  }
  async function refresh() {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(localStorage.getItem(REF) || '')}`,
    });
    if (!r.ok) throw new Error('refresh ' + r.status);
    const d = await r.json();
    store(d.user_id || localStorage.getItem(UID), d.id_token, d.refresh_token || localStorage.getItem(REF), Date.now() + (+d.expires_in || 3600) * 1000);
  }
  async function ensureAuth(force = false) { // uid estable + idToken válido (renovado si caduca)
    if (!ready()) throw new Error('sin config');
    if (!localStorage.getItem(UID)) await signup();
    const exp = +(localStorage.getItem(EXP) || 0);
    if (force || Date.now() > exp - 5 * 60 * 1000) await refresh();
    return { uid: localStorage.getItem(UID), token: localStorage.getItem(TOK) };
  }
  const url = (uid, token) => `${cfg.databaseURL.replace(/\/$/, '')}/users/${uid}/lib.json?auth=${token}`;

  async function pull() {
    if (!ready()) return false;
    try {
      let { uid, token } = await ensureAuth();
      let r = await fetch(url(uid, token));
      if (r.status === 401) { ({ uid, token } = await ensureAuth(true)); r = await fetch(url(uid, token)); }
      if (!r.ok) return false;
      const remote = await r.json();
      if (!remote || !remote.data) return false;
      if (remote.ts > +(localStorage.getItem(TS) || 0)) {
        localStorage.setItem(LIBKEY, remote.data);
        localStorage.setItem(TS, remote.ts);
        return true;
      }
      return false;
    } catch { return false; }
  }
  async function pushNow() {
    if (!ready()) return;
    try {
      let { uid, token } = await ensureAuth();
      const data = localStorage.getItem(LIBKEY) || '{}';
      const ts = Date.now();
      let r = await fetch(url(uid, token), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, ts }) });
      if (r.status === 401) { ({ uid, token } = await ensureAuth(true)); r = await fetch(url(uid, token), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, ts }) }); }
      if (r.ok) localStorage.setItem(TS, String(ts));
    } catch { /* offline: se reintenta en la próxima acción */ }
  }
  function push() { clearTimeout(pushing); pushing = setTimeout(pushNow, 2500); }
  return { ready, pull, push };
})();
