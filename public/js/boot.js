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
//    slow phone. Start it here instead, as soon as the index says which version to ask for, so it downloads while the engine
//    is still booting. app.js takes this copy by URL (see getJson) and fetches normally if it fails or the book changed.
//
//    A version remembered from the last visit was tried too, to start the download before the index arrives. It measured no
//    better: the promise callbacks run on the main thread, which is busy evaluating the engine either way, so the earlier
//    start never happened. The index-driven version below is what shipped; the honest limit is the engine's boot cost.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('sparkle-state-v1') || '{}');
    var learner = (saved.learners || {})[saved.activeLearnerId] || {};
    var packId = learner.packId;
    if (!packId || typeof fetch !== 'function') return;
    var early = {};
    window.__earlyPacks = early;
    fetch('./content/index.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (idx) {
        var packs = (idx && idx.packs) || [];
        var card = null;
        for (var i = 0; i < packs.length; i += 1) if (packs[i].id === packId) card = packs[i];
        if (!card) return;
        var url = './content/packs/' + packId + '/pack.json' + (card.v ? '?v=' + card.v : '');
        var p = fetch(url).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        });
        early[url] = p;
        p.catch(function () { delete early[url]; });
      })
      .catch(function () { /* the app fetches the book itself if this fails */ });
  } catch (e) { /* a splash is never worth a broken page */ }
})();
