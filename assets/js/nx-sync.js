/* NEXORA — nx-sync.js · Sincronización de biblioteca entre dispositivos (Fase 9, opcional)
   Firebase Realtime Database vía REST + auth anónima. NO hace nada hasta que configures
   window.NX_SYNC_CONFIG (ver FASE-9-CIERRE.md). Sin SDK, sin dependencias, clave de API
   de Firebase en cliente (protegida por las Realtime Rules del proyecto, nunca en el chat).
   Datos sincronizados: favoritos, progreso e historial (la clave nx.lib.v1 completa). */
'use strict';
window.NXSync = (() => {
  const cfg = window.NX_SYNC_CONFIG; // { apiKey: "...", databaseURL: "https://<proyecto>.firebaseio.com" }
  const LIBKEY = 'nx.lib.v1', UIDKEY = 'nx.sync.uid', TSKEY = 'nx.sync.ts';
  let pushing = null;

  const ready = () => cfg && cfg.apiKey && cfg.databaseURL;
  async function anon() {
    let uid = localStorage.getItem(UIDKEY), token = localStorage.getItem(UIDKEY + '.tok');
    if (uid && token) return { uid, token };
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
    });
    if (!r.ok) throw new Error('auth ' + r.status);
    const d = await r.json();
    uid = d.localId; token = d.idToken;
    localStorage.setItem(UIDKEY, uid); localStorage.setItem(UIDKEY + '.tok', token);
    return { uid, token };
  }
  const base = () => `${cfg.databaseURL.replace(/\/$/, '')}/users`;

  async function pull() {
    if (!ready()) return false;
    try {
      const { uid } = await anon();
      const r = await fetch(`${base()}/${uid}/lib.json`);
      if (!r.ok) return false;
      const remote = await r.json();
      if (!remote || !remote.data) return false;
      const localTs = +(localStorage.getItem(TSKEY) || 0);
      if (remote.ts > localTs) {
        localStorage.setItem(LIBKEY, remote.data);
        localStorage.setItem(TSKEY, remote.ts);
        return true; // hubo cambios
      }
      return false;
    } catch { return false; }
  }
  async function pushNow() {
    if (!ready()) return;
    try {
      const { uid, token } = await anon();
      const data = localStorage.getItem(LIBKEY) || '{}';
      const ts = Date.now();
      const r = await fetch(`${base()}/${uid}/lib.json?auth=${token}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, ts }),
      });
      if (r.ok) localStorage.setItem(TSKEY, String(ts));
    } catch { /* offline: se reintenta en la próxima acción */ }
  }
  function push() { // con debounce por ráfagas
    clearTimeout(pushing);
    pushing = setTimeout(pushNow, 2500);
  }
  return { ready, pull, push };
})();
