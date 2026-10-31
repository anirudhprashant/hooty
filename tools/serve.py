#!/usr/bin/env python3
"""Static file server for the Sparkle PWA.

Deliberately tiny and dependency-free. It serves the `public/` folder of this
project, sends correct MIME types for ES modules and webmanifests, and
supports the SPA fallback so a deep link still lands on index.html.

Binds to a Tailscale address by default so the app is reachable from the
tailnet without being exposed to the public internet.

Usage:
  python3 tools/serve.py [--root public] [--host 127.0.0.1] [--port 8111]
"""

import argparse
import http.server
import mimetypes
import os
import socketserver
import sys

MIME = {
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = MIME

    # Injected into index.html so the app works when it is served from a
    # sub-path (e.g. https://host/sparkle). A <base> element written into the
    # markup is honoured by the browser's preload scanner, which starts
    # fetching assets before any inline script can run. A base tag injected
    # by JavaScript is too late: the scanner has already resolved "./x.js"
    # against the document URL and requests it from the wrong place.
    mount = "/"

    def list_directory(self, path):
        self.send_error(404)   # never list a folder
        return None

    def _inject_base(self, body):
        mount = (self.server.mount or "/").rstrip("/")
        base = f"{mount}/" if mount else "/"
        tag = f'<base href="{base}">'
        marker = "<!--BASE-->"
        if marker in body:
            return body.replace(marker, tag, 1)
        # No marker: inject as the first element of <head>.
        i = body.lower().find("<head>")
        if i == -1:
            return body
        j = i + len("<head>")
        return body[:j] + "\n" + tag + body[j:]

    def _strip_mount(self):
        """Remove the mount prefix from the request path.

        Tailscale Serve strips the public prefix before forwarding, so the
        server normally sees "/". Accepting the prefix as well means local
        testing at http://127.0.0.1:8111/sparkle/ behaves exactly like the
        live URL, instead of silently falling back to the SPA shell.
        """
        mount = (self.server.mount or "/").rstrip("/")
        if not mount:
            return
        if self.path == mount:
            self.path = "/"
        elif self.path.startswith(mount + "/"):
            self.path = self.path[len(mount):]

    def do_GET(self):
        self._strip_mount()
        path = self.translate_path(self.path)
        is_index = path.endswith("index.html") or (
            os.path.isdir(path) and path.endswith(os.sep)
        )
        if is_index:
            index = os.path.join(path, "index.html") if os.path.isdir(path) else path
            try:
                with open(index, "rb") as fh:
                    body = fh.read().decode("utf-8")
            except OSError:
                body = None
            if body is not None:
                data = self._inject_base(body).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(data)
                return
        return super().do_GET()

    def end_headers(self):
        # The service worker must never be served stale, or an update never lands.
        if self.path.endswith("sw.js"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.path.join(os.path.dirname(__file__), "..", "public"))
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8111)
    ap.add_argument(
        "--mount",
        default="/",
        help="Public URL path the app is served under, e.g. /sparkle. "
        "A <base> tag is injected into index.html so relative asset URLs "
        "resolve inside the mount path instead of the domain root.",
    )
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    os.chdir(root)

    for ext in MIME:
        mimetypes.add_type(MIME[ext].split(";")[0], ext)

    httpd = Server((args.host, args.port), Handler)
    httpd.mount = args.mount
    sys.stderr.write(
        "Sparkle serving %s on http://%s:%d/ (mount: %s)\n"
        % (root, args.host, args.port, args.mount)
    )
    sys.stderr.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
