// Splash behaviour, loaded before the app itself. It runs from a file rather than inline because the site's
// Content-Security-Policy allows scripts only from this origin.

// 1. Greet the child in the language their device is set to. The app's own translations are not loaded yet.
(function () {
  var lang = (navigator.language || 'en').toLowerCase();
  var note = document.getElementById('boot-note');
  if (!note) return;
  if (lang.indexOf('hi') === 0) note.textContent = 'आपकी दुनिया तैयार हो रही है';
  else if (lang.indexOf('kn') === 0) note.textContent = 'ನಿಮ್ಮ ಜಗತ್ತು ಸಿದ್ಧವಾಗುತ್ತಿದೆ';
})();

// 2. A returning child should see their own world while it loads, not the default one.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('sparkle-state-v1') || '{}');
    var learner = (saved.learners || {})[saved.activeLearnerId] || {};
    var theme = learner.theme;
    var known = ['enchanted-kingdom', 'wizard-school', 'space-starlight', 'jungle-canopy', 'calm-lagoon'];
    if (!theme || known.indexOf(theme) < 0 || theme === 'enchanted-kingdom') return;
    var art = document.querySelector('.boot__art');
    if (!art) return;
    var fallback = art.getAttribute('src');
    art.removeAttribute('srcset');
    art.onerror = function () { art.onerror = null; art.src = fallback; };
    art.src = './themes/' + theme + '/assets/hero.webp';
  } catch (e) { /* a splash is not worth a broken page */ }
})();

// 3. The book the child was last in is the one thing the first screen cannot be built without, and it used to be the last
//    thing asked for: its fetch only began once every engine module had loaded and the app had booted, 2.3 seconds in on a
//    slow phone. Two things were in the way. The download could not start until content/index.json said which version to
//    ask for, and even then the promise callback waited for the main thread, which is busy evaluating the engine.
//
//    So the version is remembered from the last visit (app.js writes it when it loads a book) and the download starts here,
//    immediately. If the index then says the book has changed, this copy is aborted before it finishes and the app asks for
//    the new one; if it cannot be aborted in time it is simply ignored, because app.js only takes an early copy whose URL
//    it would have asked for itself.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('sparkle-state-v1') || '{}');
    var learner = (saved.learners || {})[saved.activeLearnerId] || {};
    var packId = learner.packId;
    if (!packId || typeof fetch !== 'function') return;
    var early = {};
    window.__earlyPacks = early;

    var grab = function (v) {
      var url = './content/packs/' + packId + '/pack.json' + (v ? '?v=' + v : '');
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var p = fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      });
      early[url] = p;
      p.catch(function () { delete early[url]; });
      return { url: url, ctrl: ctrl };
    };

    var mem = null;
    try { mem = JSON.parse(localStorage.getItem('sparkle-pack-early-v1') || 'null'); } catch (e) { mem = null; }
    var mine = mem && mem.id === packId && mem.v ? grab(mem.v) : null;

    // the index is the only thing that can say a book changed; it runs in parallel and corrects the early copy
    fetch('./content/index.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (idx) {
        var packs = (idx && idx.packs) || [];
        var card = null;
        for (var i = 0; i < packs.length; i += 1) if (packs[i].id === packId) card = packs[i];
        if (!card) return;
        if (mine && mem.v === card.v) return;             // the remembered copy is the current one
        if (mine && mine.ctrl) {                          // stale: stop paying for it
          try { mine.ctrl.abort(); } catch (e) { /* already finished */ }
          delete early[mine.url];
        }
        if (!mine) grab(card.v);                          // first visit for this device: index-driven as before
      })
      .catch(function () { /* the app fetches the book itself if this fails */ });
  } catch (e) { /* a splash is never worth a broken page */ }
})();
