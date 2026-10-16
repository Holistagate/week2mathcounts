#!/usr/bin/env python3
"""Week 2: Algebra Lab. Run python3 algebra.py (Python 3.9+, no packages)."""
import argparse
import json
import random
import re
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from questions import QUESTIONS
from question_generator import generator_catalog, matching_templates, generate_question, question_from_id
from explorers import api as explorer_api
ROOT = Path(__file__).resolve().parent
MAX_INTEGER = 10**9

def integer(query, key, default=None, low=-MAX_INTEGER, high=MAX_INTEGER):
    raw = query.get(key, [str(default) if default is not None else ""])[0]
    if len(raw) > 16 or not re.fullmatch(r"[+-]?\d+", raw, flags=re.ASCII):
        raise ValueError(f"{key} must be a whole number.")
    value = int(raw)
    if not low <= value <= high:
        raise ValueError(f"{key} must be between {low:,} and {high:,}.")
    return value


def public_question(q):
    fields = ("id", "title", "topic", "level", "prompt", "methods", "unit")
    return {**{key: q[key] for key in fields}, "generated": q.get("generated", False)}


def public_questions():
    return [public_question(q) for q in QUESTIONS]


def resolve_question(question_id):
    authored = next((q for q in QUESTIONS if q["id"] == question_id), None)
    return authored if authored is not None else question_from_id(question_id)


def question_filters(query, default_level="Contest + Stretch"):
    topic = query.get("topic", ["All topics"])[0]
    level = query.get("level", [default_level])[0]
    if topic not in {q["topic"] for q in QUESTIONS} | {"All topics"}:
        raise ValueError("Unknown topic.")
    if level not in {"All levels", "Warm-up", "Contest", "Stretch", "Contest + Stretch"}:
        raise ValueError("Unknown difficulty.")
    return topic, level


def make_generated_question(query, rng=None):
    rng = rng or random.SystemRandom()
    topic, level = question_filters(query, "All levels")
    specs = matching_templates(topic, level)
    if not specs:
        raise ValueError("No fresh questions match those filters.")
    spec = rng.choice(specs)
    return {"question": public_question(generate_question(spec["key"], rng.getrandbits(64)))}


def practice_feedback(query):
    question_id = query.get("id", [""])[0]
    question = resolve_question(question_id)
    action = query.get("action", [""])[0]
    if action == "method":
        choice = integer(query, "value", low=0, high=len(question["methods"]) - 1)
        correct = choice == question["best_method"]
        return {"correct": correct,
                "explanation": question["method_reason"] if correct else
                "That is not the recommended shortcut here. " + question["hints"][0]}
    if action == "answer":
        answer = integer(query, "value")
        correct = answer == question["answer"]
        return {"correct": correct,
                "explanation": question["solution"] if correct else
                "Try again. " + question["hints"][0]}
    if action == "hint":
        index = integer(query, "value", 0, low=0, high=len(question["hints"]) - 1)
        return {"hint": question["hints"][index], "number": index + 1}
    if action == "solution":
        return {"answer": question["answer"], "explanation": question["solution"],
                "method": question["methods"][question["best_method"]]}
    raise ValueError("Unknown practice action.")


def make_assessment(query, rng=None):
    """Balance topics and mix authored problems with fresh seeded variants."""
    rng = rng or random.SystemRandom()
    count = integer(query, "count", 10, low=1, high=20)
    topic, level = question_filters(query)
    source = query.get("source", ["mixed"])[0]
    if source not in {"bank", "mixed", "generated"}:
        raise ValueError("Unknown question source.")
    pool = [q for q in public_questions()
            if (topic == "All topics" or q["topic"] == topic)
            and (level == "All levels" or q["level"] == level
                 or (level == "Contest + Stretch" and q["level"] != "Warm-up"))]
    specs = matching_templates(topic, level) if source != "bank" else []
    if not pool and not specs or source == "generated" and not specs:
        raise ValueError("No questions match those filters. Choose another topic or difficulty.")
    groups = {}
    for question in pool if source != "generated" else []:
        groups.setdefault(question["topic"], []).append(question)
    for group in groups.values():
        rng.shuffle(group)
    generators = {}
    for spec in specs:
        generators.setdefault(spec["topic"], []).append(spec)
    actual = count if specs else min(count, len(pool))
    fresh_slots = set(range(actual)) if source == "generated" else set(
        rng.sample(range(actual), (actual + 1)//2)) if source == "mixed" else set()
    selected, prompts, ids, usage = [], set(), set(), {}
    while len(selected) < actual:
        available = sorted(set(generators) | {key for key, group in groups.items() if group})
        rng.shuffle(available)
        for key in available:
            if len(selected) >= actual:
                break
            group = groups.get(key, [])
            group[:] = [q for q in group if q["prompt"] not in prompts]
            if not group and key not in generators:
                continue
            if key in generators and (len(selected) in fresh_slots or not group):
                # Spread fresh questions across available families before reusing one.
                choices = generators[key]
                least_used = min(usage.get(s["key"], 0) for s in choices)
                spec = rng.choice([s for s in choices if usage.get(s["key"], 0) == least_used])
                for _ in range(1000):
                    q = public_question(generate_question(spec["key"], rng.getrandbits(64)))
                    if q["prompt"] not in prompts and q["id"] not in ids:
                        break
                else:
                    raise ValueError("Could not create a distinct set. Try another difficulty or topic.")
                usage[spec["key"]] = usage.get(spec["key"], 0) + 1
            else:
                q = group.pop()
            selected.append(q)
            prompts.add(q["prompt"])
            ids.add(q["id"])
    rng.shuffle(selected)
    for question in selected:
        question["method_order"] = list(range(len(question["methods"])))
        rng.shuffle(question["method_order"])
    return {"questions": selected, "requested_count": count,
            "pool_size": len(pool), "count": len(selected), "source": source,
            "generated_count": sum(q["generated"] for q in selected),
            "bank_count": sum(not q["generated"] for q in selected)}


def grade_assessment(payload):
    """Grade a complete local self-assessment, with solutions returned together."""
    if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
        raise ValueError("Submit a list of assessment answers.")
    items = payload["items"]
    if not 1 <= len(items) <= 20:
        raise ValueError("An assessment must have between 1 and 20 questions.")
    seen, results, breakdown = set(), [], {}
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            raise ValueError("Each assessment answer needs a question ID.")
        key = item["id"]
        if key in seen:
            raise ValueError("Assessment question IDs must be known and unique.")
        seen.add(key)
        q = resolve_question(key)
        raw_answer = item.get("answer")
        answer = None if raw_answer is None or str(raw_answer).strip() == "" else integer(
            {"answer": [str(raw_answer)]}, "answer")
        method = item.get("method")
        if method is not None and (not isinstance(method, int) or isinstance(method, bool)
                                   or not 0 <= method < len(q["methods"])):
            raise ValueError("Invalid strategy choice.")
        correct = answer == q["answer"]
        group = breakdown.setdefault(q["topic"], {"topic": q["topic"], "total": 0,
                                                   "correct": 0, "skipped": 0})
        group["total"] += 1
        group["correct"] += int(correct)
        group["skipped"] += int(answer is None)
        results.append({"id": key, "title": q["title"], "prompt": q["prompt"],
                        "generated": q.get("generated", False),
                        "topic": q["topic"], "level": q["level"], "answer": q["answer"],
                        "submitted_answer": answer, "correct": correct,
                        "status": "correct" if correct else "skipped" if answer is None else "incorrect",
                        "submitted_method": q["methods"][method] if method is not None else None,
                        "method_correct": method == q["best_method"] if method is not None else None,
                        "recommended_method": q["methods"][q["best_method"]],
                        "method_reason": q["method_reason"], "solution": q["solution"]})
    score = sum(r["correct"] for r in results)
    answered = sum(r["submitted_answer"] is not None for r in results)
    return {"score": score, "total": len(results), "answered": answered,
            "skipped": len(results) - answered, "percent": round(100 * score / len(results)),
            "strategy_score": sum(r["method_correct"] is True for r in results),
            "strategy_answered": sum(r["method_correct"] is not None for r in results),
            "generated_count": sum(r["generated"] for r in results),
            "topics": sorted(breakdown.values(), key=lambda group: group["topic"]),
            "results": results}


def api(path, query):
    if path == "/api/questions":
        return {"questions": public_questions(), "generators": generator_catalog()}
    if path == "/api/generate":
        return make_generated_question(query)
    if path == "/api/practice":
        return practice_feedback(query)
    if path == "/api/assessment":
        return make_assessment(query)
    return explorer_api(path, query)

class TrainerHandler(BaseHTTPRequestHandler):
    # Serve an explicit asset list, so worksheets or other local files cannot
    # accidentally be exposed by this classroom server.
    ASSETS = {"/": ("index.html", "text/html; charset=utf-8"),
              "/index.html": ("index.html", "text/html; charset=utf-8"),
              "/algebra.css": ("algebra.css", "text/css; charset=utf-8"),
              "/style.css": ("style.css", "text/css; charset=utf-8"),
              "/explorer-ui.js": ("explorer-ui.js", "text/javascript; charset=utf-8"),
              "/lessons.js": ("lessons.js", "text/javascript; charset=utf-8"),
              "/assessment.js": ("assessment.js", "text/javascript; charset=utf-8"),
              "/app.js": ("app.js", "text/javascript; charset=utf-8")}

    def respond(self, status, data, content_type="application/json; charset=utf-8"):
        body = data if isinstance(data, bytes) else json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlsplit(self.path)
        if url.path in self.ASSETS:
            filename, mime = self.ASSETS[url.path]
            try:
                self.respond(200, (ROOT / filename).read_bytes(), mime)
            except OSError:
                self.respond(500, {"error": f"Missing {filename}. Keep all trainer files together."})
        elif url.path.startswith("/api/"):
            try:
                self.respond(200, api(url.path, parse_qs(url.query, keep_blank_values=True)))
            except (ValueError, KeyError) as error:
                self.respond(400, {"error": str(error)})
        elif url.path == "/favicon.ico":
            self.respond(204, b"")
        else:
            self.respond(404, {"error": "Page not found."})

    def do_POST(self):
        if urlsplit(self.path).path != "/api/grade":
            self.respond(404, {"error": "Page not found."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 1 <= length <= 65536:
                raise ValueError("Invalid assessment request size.")
            if not self.headers.get("Content-Type", "").startswith("application/json"):
                raise ValueError("Submit assessment answers as JSON.")
            payload = json.loads(self.rfile.read(length))
            self.respond(200, grade_assessment(payload))
        except (ValueError, UnicodeDecodeError) as error:
            self.respond(400, {"error": str(error)})

    def log_message(self, format, *args):
        # Classroom use does not need a terminal line for every calculation.
        if args and str(args[1] if len(args) > 1 else "").startswith("5"):
            super().log_message(format, *args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000, help="Local port (default: 8000; 0 selects a free port)")
    parser.add_argument("--no-browser", action="store_true", help="Print the URL without opening a browser")
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("--port must be between 0 and 65535")
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), TrainerHandler)
    except OSError as error:
        print(f"Could not start the trainer: {error}\nTry --port 8001.", file=sys.stderr)
        return 1
    url = f"http://127.0.0.1:{server.server_port}"
    print(f"\nAlgebra Lab · Week 2\nOpen {url}\nPress Ctrl+C here to stop.\n", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nTrainer stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
