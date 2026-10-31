// Progress store. IndexedDB first, localStorage fallback. No network, no tracking.
// Data model is per-learner and fully exportable.

const DB_NAME = 'sparkle-db';
const DB_VERSION = 1;
const STORE = 'state';
const LS_KEY = 'sparkle-state-v1';

let dbPromise = null;
let useFallback = false;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexeddb'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    useFallback = true;
    throw err;
  });
  return dbPromise;
}

// Two copies are kept: IndexedDB (roomy) and localStorage (survives where IndexedDB is blocked).
// The newer one wins on load, so a one-off IndexedDB failure never rolls progress back or wipes it.
function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' && v.learners ? v : null;
  } catch {
    return null;
  }
}

async function readIndexed() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('state');
    req.onsuccess = () => resolve(req.result && typeof req.result === 'object' && req.result.learners ? req.result : null);
    req.onerror = () => reject(req.error);
  });
}

export async function loadState() {
  let idb = null;
  try { idb = await readIndexed(); } catch { useFallback = true; }
  const local = readLocal();
  if (idb && local) return (local.savedAt || 0) > (idb.savedAt || 0) ? local : idb;
  return idb || local;
}

export async function saveState(state) {
  const stamped = { ...state, savedAt: Date.now() };
  let ok = false;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(stamped, 'state');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    ok = true;
  } catch {
    useFallback = true;
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(stamped));
    ok = true;
  } catch { /* quota or blocked: IndexedDB copy still stands */ }
  return ok;
}

// Ask the browser not to evict progress when the device runs low on space (Safari is aggressive about this).
export async function requestPersistence() {
  try { return (await navigator.storage?.persist?.()) || false; } catch { return false; }
}

export async function clearState() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete('state');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* fallback */
  }
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

export function storageMode() {
  return useFallback ? 'local' : 'indexeddb';
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  if (!parsed || typeof parsed !== 'object' || !parsed.learners) {
    throw new Error('Not a valid Lumi save file.');
  }
  return parsed;
}
