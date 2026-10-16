#!/usr/bin/env python3
"""Preview the trainer the way Vercel serves it, before deploying.

Vercel serves public/ from its CDN and sends every /api/<endpoint> request to
api/index.py through the rewrite in vercel.json. This reproduces that split
locally, so routing problems show up here rather than in a deployment.

    python3 scripts/dev_vercel.py [--port 8787]

For ordinary classroom use run `python3 mathcounts.py` instead: that is the
same trainer served entirely by Python, with no build step.
"""

import argparse
import functools
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

sys.path.insert(0, str(ROOT / "api"))

from index import handler as function  # noqa: E402


def rewrite(path):
    """Apply the vercel.json rewrite: /api/:endpoint -> /api?endpoint=:endpoint"""
    url = urlsplit(path)
    if not url.path.startswith("/api/"):
        return path
    query = f"endpoint={url.path[len('/api/'):]}" + (f"&{url.query}" if url.query else "")
    return f"/api?{query}"


class VercelLikeHandler(function, SimpleHTTPRequestHandler):
    """Static files from public/, everything under /api from the function."""

    def do_GET(self):
        if urlsplit(self.path).path.startswith("/api"):
            self.path = rewrite(self.path)
            function.do_GET(self)
        else:
            SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        self.path = rewrite(self.path)
        function.do_POST(self)


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", type=int, default=8787, help="Local port (default: 8787)")
    args = parser.parse_args()
    build = subprocess.run([sys.executable, str(ROOT / "scripts" / "build_static.py")])
    if build.returncode:
        return build.returncode
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port),
                                     functools.partial(VercelLikeHandler, directory=str(PUBLIC)))
    except OSError as error:
        print(f"Could not start the preview: {error}\nTry --port 8788.", file=sys.stderr)
        return 1
    print(f"\nMATHCOUNTS Lab · Vercel preview\nOpen http://127.0.0.1:{server.server_port}"
          f"\nPress Ctrl+C here to stop.\n", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nPreview stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
