#!/usr/bin/env python3
"""A small upload page: drop in a textbook PDF, watch Sparkle turn it into a course.

  python3 tools/ingest-server.py [--port 8120] [--host 127.0.0.1]
  SPARKLE_UPLOAD_TOKEN=secret python3 tools/ingest-server.py --host 0.0.0.0   # require a token when exposed

Books are processed one at a time (each uses the MiniMax and image services). Progress comes from
work/<slug>/status.json, written by tools/ingest-book.py. Set SPARKLE_DEPLOY to publish when a book finishes.
Only upload books you have the right to use: the text is kept locally and never copied into the app."""
import argparse, glob, http.server, json, os, queue, re, subprocess, sys, tempfile, threading, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
TOKEN = os.environ.get('SPARKLE_UPLOAD_TOKEN', '')
jobs = queue.Queue()

def worker():
    while True:
        cmd = jobs.get()
        subprocess.run(cmd, cwd=ROOT, stdout=open(f'{ROOT}/work/ingest-server.log', 'a'), stderr=subprocess.STDOUT)
        jobs.task_done()
threading.Thread(target=worker, daemon=True).start()

def books():
    reg = json.load(open(f'{HERE}/subjects.json')) if os.path.exists(f'{HERE}/subjects.json') else {}
    out = []
    for slug, b in reg.items():
        p = f'{ROOT}/work/{slug}/status.json'
        if os.path.exists(p): out.append({'slug': slug, 'name': b['name'], 'grade': b.get('grade', ''), **json.load(open(p))})
    for p in glob.glob(f'{ROOT}/work/*/status.json'):  # uploaded but not yet registered (still extracting)
        slug = p.split('/')[-2]
        if slug not in reg: out.append({'slug': slug, 'name': slug, 'grade': '', **json.load(open(p))})
    return out

PAGE = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sparkle: add a book</title>
<style>
:root{--bg:#fff3f6;--ink:#2a1a4a;--mut:#6b5a86;--card:#fff;--pri:#ffc533;--edge:#d99b00;--ok:#0f7b57;--bad:#c0392b}
@media(prefers-color-scheme:dark){:root{--bg:#1d1330;--ink:#f6efff;--mut:#b9a8d6;--card:#2a1c45}}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.5 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}h1{font-size:2rem;margin:.2em 0}p.sub{color:var(--mut);margin-top:0}
.card{background:var(--card);border-radius:20px;padding:20px;margin:16px 0}
label{display:block;font-weight:700;margin:12px 0 4px}input[type=text],input[type=number],input[type=password]{width:100%;padding:12px;border:2px solid #cdbfe3;border-radius:12px;font:inherit;background:transparent;color:inherit}
.drop{border:3px dashed #cdbfe3;border-radius:16px;padding:28px;text-align:center;cursor:pointer}.drop.on{border-color:var(--edge);background:#ffc53322}
button{width:100%;margin-top:16px;padding:14px;border:0;border-radius:999px;background:var(--pri);box-shadow:0 5px 0 var(--edge);font:700 1.05rem system-ui;color:#2a1a4a;cursor:pointer}button:disabled{opacity:.5}
.stage{display:flex;gap:10px;align-items:center;padding:4px 0}.dot{width:14px;height:14px;border-radius:50%;background:#cdbfe3;flex:none}.done .dot{background:var(--ok)}.running .dot{background:var(--pri);animation:p 1s infinite}.failed .dot,.partial .dot{background:var(--bad)}.skipped .dot{background:#9a8bb5}
@keyframes p{50%{transform:scale(1.5)}}small{color:var(--mut)}
</style></head><body><main>
<h1>Add a textbook</h1><p class="sub">Upload a PDF and Sparkle turns it into lessons, questions, pictures and a voice. It takes a while; you can close this page.</p>
<div class="card"><label>Textbook PDF (or a zip of one PDF per chapter)</label>
<div class="drop" id="drop">Drop a file here or tap to choose<input id="file" type="file" accept=".pdf,.zip" hidden></div><small id="fname"></small>
<label>Subject name</label><input id="name" type="text" placeholder="Mathematics">
<label>Class / grade</label><input id="grade" type="number" min="1" max="12" value="6">
<label id="tl" hidden>Upload token</label><input id="token" type="password" hidden>
<button id="go" disabled>Make it a course</button><p id="msg"></p></div>
<h2>Your books</h2><div id="books"></div>
</main><script>
const $=s=>document.querySelector(s);let file=null;
fetch('/api/config').then(r=>r.json()).then(c=>{if(c.token){$('#token').hidden=$('#tl').hidden=false}});
const drop=$('#drop'),inp=$('#file');drop.onclick=()=>inp.click();
['dragover','dragenter'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('on')}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('on')}));
drop.addEventListener('drop',ev=>pick(ev.dataTransfer.files[0]));inp.onchange=()=>pick(inp.files[0]);
function pick(f){if(!f)return;file=f;$('#fname').textContent=f.name+' ('+(f.size/1048576).toFixed(1)+' MB)';if(!$('#name').value)$('#name').value=f.name.replace(/\.(pdf|zip)$/i,'').replace(/[_-]+/g,' ');$('#go').disabled=false}
$('#go').onclick=async()=>{$('#go').disabled=true;$('#msg').textContent='Uploading…';
 const q=new URLSearchParams({name:$('#name').value,grade:$('#grade').value,filename:file.name});
 const r=await fetch('/api/upload?'+q,{method:'PUT',body:file,headers:{'X-Token':$('#token').value}});
 $('#msg').textContent=r.ok?'Started! Progress is below.':'Could not start: '+await r.text();load()};
const ORDER=['extract','chapters','lessons','pack','audio','deploy','finished'];
const LABEL={extract:'Read the book',chapters:'Find the chapters',lessons:'Write lessons and questions',pack:'Build the course',audio:'Record the voice',deploy:'Publish',finished:'Ready'};
async function load(){const bs=await (await fetch('/api/books')).json();
 $('#books').innerHTML=bs.length?bs.map(b=>`<div class="card"><b>${b.name}</b> <small>Class ${b.grade} · ${b.slug}</small>`+ORDER.filter(k=>b.stages[k]).map(k=>{const s=b.stages[k];return `<div class="stage ${s.state}"><span class="dot"></span><span>${LABEL[k]}</span><small>${s.note||''}</small></div>`}).join('')+`</div>`).join(''):'<p class="sub">Nothing yet.</p>'}
load();setInterval(load,5000);
</script></body></html>'''

class H(http.server.BaseHTTPRequestHandler):
    def send(self, code, body, ctype='application/json'):
        b = body if isinstance(body, bytes) else (body if isinstance(body, str) else json.dumps(body)).encode()
        self.send_response(code); self.send_header('Content-Type', ctype + '; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == '/': self.send(200, PAGE, 'text/html')
        elif u.path == '/api/books': self.send(200, books())
        elif u.path == '/api/config': self.send(200, {'token': bool(TOKEN)})
        else: self.send(404, {'error': 'not found'})
    def do_PUT(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != '/api/upload': return self.send(404, 'not found', 'text/plain')
        if TOKEN and self.headers.get('X-Token') != TOKEN: return self.send(403, 'wrong token', 'text/plain')
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        name = (q.get('name') or '').strip()[:60]; grade = re.sub(r'\D', '', q.get('grade', '6')) or '6'
        if not name: return self.send(400, 'give the subject a name', 'text/plain')
        ext = '.zip' if q.get('filename', '').lower().endswith('.zip') else '.pdf'
        n = int(self.headers.get('Content-Length', 0))
        if n <= 0 or n > 1 << 30: return self.send(400, 'file missing or over 1 GB', 'text/plain')
        os.makedirs(f'{ROOT}/work/uploads', exist_ok=True)
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') + f'-g{grade}'
        path = f'{ROOT}/work/uploads/{slug}{ext}'
        with open(path, 'wb') as f:
            left = n
            while left: chunk = self.rfile.read(min(1 << 20, left)); f.write(chunk); left -= len(chunk)
        head = open(path, 'rb').read(4)
        if ext == '.pdf' and head != b'%PDF' or ext == '.zip' and head[:2] != b'PK': return self.send(400, 'that does not look like a PDF or zip', 'text/plain')
        os.makedirs(f'{ROOT}/work/{slug}', exist_ok=True)
        json.dump({'stages': {'extract': {'state': 'running', 'note': 'queued'}}}, open(f'{ROOT}/work/{slug}/status.json', 'w'))
        jobs.put([sys.executable, f'{HERE}/ingest-book.py', path, '--name', name, '--grade', grade, '--slug', slug])
        self.send(200, {'slug': slug})
    def log_message(self, *a): pass

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--port', type=int, default=8120); ap.add_argument('--host', default='127.0.0.1')
    a = ap.parse_args(); print(f'Sparkle book upload on http://{a.host}:{a.port}/', flush=True)
    http.server.ThreadingHTTPServer((a.host, a.port), H).serve_forever()
