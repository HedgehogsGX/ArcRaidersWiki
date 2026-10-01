#!/usr/bin/env python3
"""Local preview server for the wiki.

Same as `python3 -m http.server`, but tells the browser not to cache, so edits
show up on a normal reload, and serves /news-full/<file> like worker.js does
(full-size news images from assets.arcraiders.com). Usage:
python3 scripts/serve.py [port]
"""

import http.server
import os
import re
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request

NEWS_FULL = "/news-full/"
MEDIA = "https://assets.arcraiders.com/media/"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith(NEWS_FULL):
            return self.news_full()
        super().do_GET()

    def news_full(self):
        url = urllib.parse.urlsplit(self.path)
        name = urllib.parse.unquote(url.path[len(NEWS_FULL):])
        if not re.fullmatch(r"[^/\\]+\.(jpe?g|png|webp|gif)", name, re.I):
            return self.send_error(404)
        try:
            upstream = urllib.request.urlopen(MEDIA + urllib.parse.quote(name), timeout=30)
        except (urllib.error.URLError, TimeoutError):
            return self.send_error(404)
        with upstream:
            kind = upstream.headers.get("Content-Type", "")
            if not kind.startswith("image/"):
                return self.send_error(404)
            self.send_response(200)
            self.send_header("Content-Type", kind)
            if upstream.headers.get("Content-Length"):
                self.send_header("Content-Length", upstream.headers["Content-Length"])
            if "download" in urllib.parse.parse_qs(url.query, keep_blank_values=True):
                self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{urllib.parse.quote(name)}")
            self.end_headers()
            shutil.copyfileobj(upstream, self.wfile)


if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Serving on http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
