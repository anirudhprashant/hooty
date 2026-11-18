// Word bank search. Written the same way as /books/books-search.js: nothing loads until someone types, and the page
// stays readable without JavaScript because every word already has its own place on the letter pages.
(function () {
  var input = document.getElementById('word-search');
  var results = document.getElementById('word-results');
  var status = document.getElementById('word-search-status');
  if (!input || !results) return;

  var words = null;
  var loading = null;

  function load() {
    if (words) return Promise.resolve(words);
    if (!loading) {
      loading = fetch('/glossary/index.json')
        .then(function (r) { if (!r.ok) throw new Error('index ' + r.status); return r.json(); })
        .then(function (data) {
          var books = data.books || {};
          words = (data.words || []).map(function (row) {
            var b = books[row[3]] || [];
            return { term: row[0], meaning: row[1], page: row[2], book: row[3], chapter: row[4], pno: row[5],
                     title: b[0] || '', subject: b[1] || '', grade: b[2] || '', lang: b[3] || 'en' };
          });
          return words;
        })
        .catch(function () { words = []; return words; });
    }
    return loading;
  }

  function line(w) {
    var li = document.createElement('li');
    li.className = 'result';
    var a = document.createElement('a');
    a.href = w.page;
    a.textContent = w.term;
    var meta = document.createElement('span');
    meta.className = 'result__meta';
    meta.textContent = w.meaning;
    var from = document.createElement('span');
    from.className = 'result__meta';
    from.textContent = (w.title || 'Hooty') + (w.chapter ? ' · chapter ' + w.chapter : '') + (w.pno ? ', page ' + w.pno : '')
      + (w.more ? ' and ' + w.more + ' more book' + (w.more === 1 ? '' : 's') : '');
    li.appendChild(a);
    li.appendChild(meta);
    li.appendChild(from);
    results.appendChild(li);
  }

  function show(text) {
    var q = text.trim().toLowerCase();
    results.innerHTML = '';
    if (q.length < 2) { status.textContent = words ? words.length + ' words ready to search.' : ''; return; }
    load().then(function (rows) {
      var starts = [];
      var has = [];
      for (var i = 0; i < rows.length; i++) {
        var t = rows[i].term.toLowerCase();
        if (t === q) { starts.unshift(rows[i]); continue; }
        if (t.indexOf(q) === 0 || t.indexOf(q) > -1) starts.push(rows[i]);
        else if (rows[i].meaning.toLowerCase().indexOf(q) > -1) has.push(rows[i]);
      }
      var all = starts.concat(has);
      var seenTerm = {};
      var unique = [];
      all.forEach(function (w) {
        var k = w.term.toLowerCase();
        if (seenTerm[k]) { seenTerm[k].more += 1; return; }
        seenTerm[k] = w;
        w.more = 0;
        unique.push(w);
      });
      unique.slice(0, 25).forEach(line);
      status.textContent = unique.length
        ? 'Showing ' + Math.min(unique.length, 25) + ' of ' + unique.length + ' words.'
        : 'No word like that. Try a shorter part of it.';
    });
  }

  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { show(input.value); }, 120);
  });
  input.addEventListener('focus', function () {
    // the data is 7,000 words, so it waits for a real intention instead of arriving with the page
    load().then(function (rows) { if (!status.textContent) status.textContent = rows.length + ' words ready to search.'; });
  });
})();
