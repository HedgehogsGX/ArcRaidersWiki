#!/usr/bin/env python3
"""Puts the newest store skin in the home page hero.

Every official "Store Update" post opens with a 1920x622 banner: the ARC Raiders
logo and stripes on the left, the outfit that just went on sale on the right.
This script finds the newest such post in content/news.js (run
scripts/fetch-news.mjs first), downloads its banner at full size, cuts the
figure out and saves it as assets/img/brand/store-skin.webp.

    python3 scripts/fetch-store-skin.py          only when there is a newer post
    python3 scripts/fetch-store-skin.py --force  cut out the newest post again

content/store-skin.json records which post the current image came from. The
cutout uses BiRefNet (MIT licence), the model rembg ships as birefnet-general.
The 928 MB model is downloaded on first use into ~/.cache/arc-raiders-wiki/ and
checked against its MD5. Needs `pip install onnxruntime numpy pillow`, but only
when there is a new banner to cut out. A banner that isn't the usual layout, or
a cutout that doesn't look like a figure, leaves the current image in place.
"""

import hashlib
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
NEWS = os.path.join(ROOT, "content/news.js")
STATE = os.path.join(ROOT, "content/store-skin.json")
OUT = os.path.join(ROOT, "assets/img/brand/store-skin.webp")
UA = "ArcRaidersWiki store skin sync (+https://github.com/HedgehogsGX/ArcRaidersWiki)"

MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-epoch_244.onnx"
MODEL_MD5 = "7a35a0141cbbc80de11d9c9a28f52697"
MODEL_DIR = os.path.join(os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache"), "arc-raiders-wiki")

# The left part of the banner holds the logo and stripes. The model drops any
# lettering the figures overlap, as long as the logo itself is cropped off.
LOGO_WIDTH = 0.46
# An arm or rifle that reaches under the logo is cut off straight at the crop,
# with notches where the lettering covered it. When the figure touches the crop,
# it fades out over this share of the width instead.
EDGE_FADE = 0.16
# Share of the cropped banner the figure should cover; outside it, something went wrong.
COVERAGE = (0.08, 0.85)


def get(url):
    parts = urllib.parse.urlsplit(url)
    url = urllib.parse.urlunsplit(parts._replace(path=urllib.parse.quote(parts.path, safe="/()%")))
    req = urllib.request.Request(url, headers={"user-agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read()


def newest_store_post():
    with open(NEWS, encoding="utf-8") as f:
        text = f.read()
    news = json.loads(re.search(r"window\.ARC_NEWS = (.*);", text, re.S).group(1))
    return next((p for p in news if p["id"].startswith("store-update")), None)


def banner_url(post):
    """The full-size original of the article's first image."""
    html = get(post["url"]).decode("utf-8")
    body = html.find('<div class="payload-richtext">')
    first = re.search(r'<img[^>]*\ssrc="([^"]+)"', html[body:]) if body >= 0 else None
    if not first:
        return None
    shown = first.group(1).replace("&amp;", "&")
    # The page's React payload pairs each resized image with its original.
    q = r'\\?"'
    original = re.search(f"tabletUrl{q}:{q}{re.escape(shown)}{q}.{{0,400}}?originalUrl{q}:{q}([^\"\\\\]+)", html)
    return original.group(1) if original else shown


def model_path():
    path = os.path.join(MODEL_DIR, "birefnet-general.onnx")
    if os.path.exists(path):
        return path
    os.makedirs(MODEL_DIR, exist_ok=True)
    print(f"Downloading the BiRefNet model (928 MB) into {MODEL_DIR}")
    md5 = hashlib.md5()
    part = path + ".part"
    with urllib.request.urlopen(MODEL_URL, timeout=60) as res, open(part, "wb") as f:
        while chunk := res.read(1 << 20):
            md5.update(chunk)
            f.write(chunk)
    if md5.hexdigest() != MODEL_MD5:
        os.remove(part)
        raise RuntimeError("the downloaded model doesn't match its MD5")
    os.replace(part, path)
    return path


def cut_out(image):
    """The figure in `image` on a transparent background, as rembg's birefnet-general does it."""
    import numpy as np
    import onnxruntime
    from PIL import Image

    session = onnxruntime.InferenceSession(model_path(), providers=["CPUExecutionProvider"])
    x = np.asarray(image.convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS), dtype=np.float32)
    x = (x / max(x.max(), 1e-6) - (0.485, 0.456, 0.406)) / (0.229, 0.224, 0.225)
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    pred = session.run(None, {session.get_inputs()[0].name: x})[0][0, 0]
    pred = 1 / (1 + np.exp(-pred))
    pred = (pred - pred.min()) / (pred.max() - pred.min())
    mask = Image.fromarray((pred * 255).astype(np.uint8), "L").resize(image.size, Image.Resampling.LANCZOS)
    alpha = np.asarray(mask, dtype=np.float32)
    alpha[alpha < 8] = 0
    if alpha[:, :3].max() > 128:
        t = np.linspace(0, 1, round(alpha.shape[1] * EDGE_FADE))
        alpha[:, : t.size] *= t * t * (3 - 2 * t)
    cutout = image.convert("RGBA")
    cutout.putalpha(Image.fromarray(alpha.astype(np.uint8), "L"))
    return cutout, alpha.mean() / 255


def main():
    force = "--force" in sys.argv
    post = newest_store_post()
    if not post:
        print("No Store Update among the synced posts; the hero figure stays.")
        return
    state = {}
    if os.path.exists(STATE):
        with open(STATE, encoding="utf-8") as f:
            state = json.load(f)
    if state.get("post") == post["id"] and not force:
        print(f"Hero figure is up to date ({post['id']}).")
        return

    from PIL import Image

    url = banner_url(post)
    if not url:
        print(f"No banner found in {post['url']}; the hero figure stays.")
        return
    banner = Image.open(io.BytesIO(get(url)))
    w, h = banner.size
    if not 2.8 < w / h < 3.4:
        print(f"The {post['id']} banner is {w}x{h}, not the usual store layout; the hero figure stays.")
        return
    crop = banner.crop((round(w * LOGO_WIDTH), 0, w, h))
    cutout, coverage = cut_out(crop)
    if not COVERAGE[0] < coverage < COVERAGE[1]:
        print(f"The cutout covers {coverage:.0%} of the {post['id']} banner, which doesn't look like a figure; the hero figure stays.")
        return
    cutout = cutout.crop(cutout.getchannel("A").getbbox())
    cutout.save(OUT, "WEBP", quality=88, method=6)

    record = {"post": post["id"], "date": post["date"], "title": post["title"]["en"], "banner": url}
    with open(STATE, "w", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    print(f"Saved {os.path.relpath(OUT, ROOT)} ({cutout.width}x{cutout.height}) from {post['title']['en']}.")


if __name__ == "__main__":
    main()
