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
