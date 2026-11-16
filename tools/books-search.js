// Search for the public books page. The app is a single page with no address for a lesson of its own until
// now, so nothing on the site could answer "which book has photosynthesis?". The generator writes
// /books/index.json (book, chapter and lesson titles, about 66 KB gzipped) and this filters it in place.
// Plain script, no framework, no network calls except that one file, loaded only when someone types.
(function () {
  var input = document.getElementById('book-search');
  var results = document.getElementById('book-results');
  var status = document.getElementById('book-search-status');
  if (!input || !results) return;

  var index = null;
  var loading = null;
  var flat = null;

  function load() {
    if (flat) return Promise.resolve(flat);
    if (!loading) {
      loading = fetch('/books/index.json')
        .then(function (r) { if (!r.ok) throw new Error('index ' + r.status); return r.json(); })
        .then(function (books) {
          index = books;
          flat = [];
          books.forEach(function (b) {
            var id = b[0], grade = b[1], subject = b[2], title = b[3], chapters = b[4];
            chapters.forEach(function (c) {
              c[1].forEach(function (l) {
                flat.push({ pack: id, grade: grade, subject: subject, book: title, chapter: c[0], id: l[0], title: l[1] });
              });
            });
          });
          return flat;
        })
        .catch(function () { return null; });
    }
    return loading;
  }

  function score(item, tokens) {
    var title = (item.title || '').toLowerCase();
    var chapter = (item.chapter || '').toLowerCase();
    var book = (item.book || '').toLowerCase();
    var s = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (title.indexOf(t) >= 0) s += 6;
      else if (chapter.indexOf(t) >= 0) s += 3;
      else if (book.indexOf(t) >= 0) s += 1;
      else return 0;
    }
    if (title.indexOf(tokens[0]) === 0) s += 4;
    return s;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function show(list, q) {
    results.innerHTML = '';
    if (!q) { status.textContent = ''; return; }
    if (!list || !list.length) {
      status.textContent = 'No lesson has "' + q + '" in its title.';
      return;
    }
    status.textContent = list.length + (list.length === 1 ? ' lesson matches "' : ' lessons match "') + q + '".';
    var frag = document.createDocumentFragment();
    list.slice(0, 40).forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'result';
      var a = document.createElement('a');
      a.href = '/#/lesson/' + encodeURIComponent(r.pack) + '/' + encodeURIComponent(r.id);
      a.textContent = r.title;
      var meta = document.createElement('span');
      meta.className = 'result__meta';
      meta.textContent = 'Class ' + r.grade + ' ' + r.subject + ' · ' + r.book + ' · ' + r.chapter;
      li.appendChild(a);
      li.appendChild(meta);
      frag.appendChild(li);
    });
    results.appendChild(frag);
  }

  var timer = null;
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    clearTimeout(timer);
    if (q.length < 2) { show(null, ''); return; }
    timer = setTimeout(function () {
      load().then(function (all) {
        if (!all) { status.textContent = 'Search is not available right now.'; return; }
        var tokens = q.split(/\s+/).filter(Boolean);
        var hits = [];
        for (var i = 0; i < all.length; i++) {
          var s = score(all[i], tokens);
          if (s > 0) { all[i]._s = s; hits.push(all[i]); }
        }
        hits.sort(function (a, b) { return b._s - a._s; });
        show(hits, q);
      });
    }, 130);
  });

  // Warm the index when the page goes idle, so the first keystroke is instant.
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 5000 }); else setTimeout(load, 3000);
})();
