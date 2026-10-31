// Books a family made from their own PDFs. They live only in this browser, in their own database, apart from progress.
const DB = 'lumi-mybooks', STORE = 'books';
function open() {
  return new Promise((done, fail) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(STORE, { keyPath: 'id' });
    q.onsuccess = () => done(q.result); q.onerror = () => fail(q.error);
  });
}
const run = async (mode, fn) => { const db = await open(); return new Promise((done, fail) => { const t = db.transaction(STORE, mode); const q = fn(t.objectStore(STORE)); t.oncomplete = () => { db.close(); done(q?.result); }; t.onerror = t.onabort = () => { db.close(); fail(t.error); }; }); };
export const saveBook = (pack) => run('readwrite', (s) => s.put(pack));
export const getBook = (id) => run('readonly', (s) => s.get(id));
export const deleteBook = (id) => run('readwrite', (s) => s.delete(id));
// The small cards only, so a big book does not slow the app's start.
export async function listBooks() {
  try {
    const all = await run('readonly', (s) => s.getAll());
    return all.map((p) => ({ id: p.id, title: p.title, subject: p.subject, grade: 'mine', language: p.language, description: p.description, local: true }));
  } catch { return []; }
}
