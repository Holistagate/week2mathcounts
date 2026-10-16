#!/usr/bin/env python3
"""Vercel Function serving the MATHCOUNTS Lab practice API.

The browser calls /api/<endpoint>; vercel.json rewrites each of those to this
function and repeats <endpoint> in the query string, so routing works whether
the function receives the original URL or the rewritten one.

Every calculation stays in combined/, which is also the local
`python3 mathcounts.py` server, so the deployed trainer and the local one
share one implementation of the question bank, generators, and grading.
"""

import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

# combined/ first on the path: its mathcounts.py is the trainer, while the
# repository root holds only a launcher of the same name.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "combined"))

from mathcounts import api, grade_assessment  # noqa: E402

MAX_BODY = 65536


def request_parts(path):
    """Return the endpoint name and the query for an incoming request."""
    url = urlsplit(path)
    query = parse_qs(url.query, keep_blank_values=True)
    endpoint = query.pop("endpoint", [""])[0] or url.path.rsplit("/", 1)[-1]
    return endpoint, query


class handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        endpoint, query = request_parts(self.path)
        try:
            self.respond(200, api(f"/api/{endpoint}", query))
        except (ValueError, KeyError) as error:
            self.respond(400, {"error": str(error)})

    def do_POST(self):
        endpoint, _ = request_parts(self.path)
        if endpoint != "grade":
            self.respond(404, {"error": "Page not found."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 1 <= length <= MAX_BODY:
                raise ValueError("Invalid assessment request size.")
            if not self.headers.get("Content-Type", "").startswith("application/json"):
                raise ValueError("Submit assessment answers as JSON.")
            payload = json.loads(self.rfile.read(length))
            self.respond(200, grade_assessment(payload))
        except (ValueError, KeyError, UnicodeDecodeError) as error:
            self.respond(400, {"error": str(error)})
