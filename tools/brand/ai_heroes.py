#!/usr/bin/env python3
"""Flat home-hero backgrounds for when Hooty is the guide, made with Nano Banana 2.1 on Kie (6 credits each at 2K).
A style reference (style-ref.png: Hooty on a flat scene) keeps the look consistent. Writes
public/themes/<id>/assets/hero-hooty.webp. Usage: python3 tools/brand/ai_heroes.py [theme ...]          Hooty backgrounds (hero-hooty.webp)
       python3 tools/brand/ai_heroes.py --lumi [theme ...]   Lumi painted backgrounds (hero.webp)"""
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
# Lumi's backgrounds: painted storybook watercolour like the original kingdom/lagoon/jungle art, in colours that
# set off Lumi (deep blue cape, warm brown satchel and boots). Reference images: the painted kingdom hero + Lumi.
STYLE_LUMI = ("A painted storybook background in exactly the style of the first reference image: soft watercolour and gouache, "
              "visible paper texture, gentle hand-painted light, rich but calm colours. It must complement the character in the second "
              "reference image (deep blue cape, warm brown satchel and boots): warm glowing tones around the middle so she stands out, "
              "no large areas of the same deep blue right behind her. Keep the lower-middle third of the picture as an open, softly lit "
              "patch of ground with nothing on it, because she will stand there. Do not draw the character or any people, animals, "
              "faces, text, letters or logos. Wide 16:9 scene. Scene: ")
SCENES_LUMI = {
    "space-starlight": "a dreamy outer-space landscape at night: a deep indigo sky full of soft glowing stars and a swirl of galaxy, a large ringed coral planet and a small blue moon, a gentle rocky lilac moon surface in the foreground with soft craters, a tiny distant rocket.",
    "wizard-school": "a magical old wizard school at night: a grand dark castle with many warm glowing windows and pointed towers, a huge soft full moon, floating candles with warm halos, a few owls on a balcony far away, a moonlit lawn in the foreground.",
}


def api(method, url, body=None, files=None):
    if files:
        r = subprocess.run(["curl", "-s", "-X", "POST", url, "-H", f"Authorization: Bearer {KEY}"] + sum([["-F", f] for f in files], []), capture_output=True, text=True)
        return json.loads(r.stdout)
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, method=method, headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())
def make(theme, ref_url, lumi=False):
    prompt = (STYLE_LUMI + SCENES_LUMI[theme]) if lumi else (STYLE + SCENES[theme])
    refs = ref_url if isinstance(ref_url, list) else [ref_url]
    r = api("POST", "https://api.kie.ai/api/v1/jobs/createTask", {"model": "nano-banana-2-1", "input": {"prompt": prompt, "image_input": refs, "aspect_ratio": "16:9", "resolution": "2K", "output_format": "png"}})
    if r.get("code") != 200: return theme, f"createTask {r.get('code')} {r.get('msg')}"
    tid = r["data"]["taskId"]; t0 = time.time()
    while time.time() - t0 < 300:
        time.sleep(4)
        d = api("GET", f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={tid}")["data"]
        if d["state"] == "success":
            url = (d.get("response") or {}).get("resultUrls", [None])[0] or json.loads(d["resultJson"])["resultUrls"][0]
            png = os.path.join(HERE, f"ai-{theme}.png"); urllib.request.urlretrieve(url, png)
            out = os.path.join(ROOT, "public/themes", theme, "assets/hero.webp" if lumi else "assets/hero-hooty.webp")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", png, "-vf", "scale=1600:-2", "-c:v", "libwebp", "-q:v", "86", out], check=True)
            return theme, f"ok {d.get('creditsConsumed')} credits"
        if d["state"] == "fail": return theme, f"fail {d.get('failMsg')}"
    return theme, "timeout"
if __name__ == "__main__":
    up_ = lambda path, name: api("POST", "https://kieai.redpandaai.co/api/file-stream-upload", files=[f"file=@{path}", "uploadPath=images/hooty-ref", f"fileName={name}"])["data"]["downloadUrl"]
    lumi = "--lumi" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if lumi:
        # PNG copies of the references (the upload service takes png/jpg/webp; webp passes through as-is)
        ref = [up_(os.path.join(ROOT, "public/themes/enchanted-kingdom/assets/hero.webp"), "kingdom.webp"), up_(os.path.join(ROOT, "public/characters/lumi/explorer-idle.webp"), "lumi.webp")]
        themes = args or list(SCENES_LUMI)
    else:
        ref = up_(os.path.join(HERE, "style-ref.png"), "style-ref.png"); themes = args or list(SCENES)
    with cf.ThreadPoolExecutor(5) as ex:
        for theme, res in ex.map(lambda t: make(t, ref, lumi), themes): print(theme, res)
