#!/usr/bin/env python3
"""Flat home-hero backgrounds for when Hooty is the guide, made with Nano Banana 2.1 on Kie (6 credits each at 2K).
A style reference (style-ref.png: Hooty on a flat scene) keeps the look consistent. Writes
public/themes/<id>/assets/hero-hooty.webp. Usage: python3 tools/brand/ai_heroes.py [theme ...]"""
import concurrent.futures as cf, json, os, subprocess, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
KEY = open(os.path.expanduser("~/.config/hooty/kie.key")).read().strip()
STYLE = ("Flat vector background for a children's TV cartoon, matching the reference image's style exactly: no outlines, "
         "flat colours, every shape has one soft darker shade on one side, simple rounded geometric shapes, gentle pastel palette "
         "that sits well behind a sunny yellow character (#ffc94f) without matching its yellow. Keep the lower-middle third of the "
         "picture as open, flat, plain ground with nothing on it, because a character will stand there. Do not draw the yellow "
         "character or any characters, people, animals, faces, text, letters or logos. Wide 16:9 scene. Scene: ")
SCENES = {
    "enchanted-kingdom": "a fairytale kingdom at dusk: lavender and pink sky with a crescent moon and a few stars, rolling green hills, a friendly pastel castle with round towers and little flags on a hill to the right, a winding path, a few round trees.",
    "calm-lagoon": "a sunny tropical lagoon: peach sky, small fluffy clouds, calm turquoise sea, a small island with a red-and-white lighthouse and a palm tree on the left, a tiny sailboat, a sandy beach in the foreground.",
    "jungle-canopy": "a bright friendly jungle clearing: big rounded leaves framing the sides, tall trees, soft sunbeams from the top, a few hanging vines, a soft green grassy clearing in the foreground.",
    "space-starlight": "a cosy outer-space scene: deep navy-blue sky with simple dotted stars, a ringed orange planet and a small blue planet, a gentle purple moon surface with round craters in the foreground.",
    "wizard-school": "a magical wizard school at night: deep purple sky, a big round moon, a dark castle with many lit warm windows and pointed towers in the background, floating candles, a soft purple lawn in the foreground.",
}
def api(method, url, body=None, files=None):
    if files:
        r = subprocess.run(["curl", "-s", "-X", "POST", url, "-H", f"Authorization: Bearer {KEY}"] + sum([["-F", f] for f in files], []), capture_output=True, text=True)
        return json.loads(r.stdout)
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, method=method, headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())
def make(theme, ref_url):
    r = api("POST", "https://api.kie.ai/api/v1/jobs/createTask", {"model": "nano-banana-2-1", "input": {"prompt": STYLE + SCENES[theme], "image_input": [ref_url], "aspect_ratio": "16:9", "resolution": "2K", "output_format": "png"}})
    if r.get("code") != 200: return theme, f"createTask {r.get('code')} {r.get('msg')}"
    tid = r["data"]["taskId"]; t0 = time.time()
    while time.time() - t0 < 300:
        time.sleep(4)
        d = api("GET", f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={tid}")["data"]
        if d["state"] == "success":
            url = (d.get("response") or {}).get("resultUrls", [None])[0] or json.loads(d["resultJson"])["resultUrls"][0]
            png = os.path.join(HERE, f"ai-{theme}.png"); urllib.request.urlretrieve(url, png)
            out = os.path.join(ROOT, "public/themes", theme, "assets/hero-hooty.webp")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", png, "-vf", "scale=1600:-2", "-c:v", "libwebp", "-q:v", "86", out], check=True)
            return theme, f"ok {d.get('creditsConsumed')} credits"
        if d["state"] == "fail": return theme, f"fail {d.get('failMsg')}"
    return theme, "timeout"
if __name__ == "__main__":
    up = api("POST", "https://kieai.redpandaai.co/api/file-stream-upload", files=[f"file=@{os.path.join(HERE, 'style-ref.png')}", "uploadPath=images/hooty-ref", "fileName=style-ref.png"])
    ref = up["data"]["downloadUrl"]
    themes = sys.argv[1:] or list(SCENES)
    with cf.ThreadPoolExecutor(5) as ex:
        for theme, res in ex.map(lambda t: make(t, ref), themes): print(theme, res)
