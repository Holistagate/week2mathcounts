#!/usr/bin/env python3
"""Copy the trainer's browser files into public/ for the Vercel build.

combined/ remains the single source of truth. The file list comes from the
same allowlist the local server serves, so registering a new stylesheet or
script in TrainerHandler.ASSETS is all it takes to deploy it. Nothing else
from the repository reaches the web: the question bank, the generators, and
the worksheets stay out of public/ and are reachable only through the API.
"""

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRAINER = ROOT / "combined"
PUBLIC = ROOT / "public"

sys.path.insert(0, str(TRAINER))

from mathcounts import TrainerHandler  # noqa: E402


def main():
    names = sorted({filename for filename, _ in TrainerHandler.ASSETS.values()})
    missing = [name for name in names if not (TRAINER / name).is_file()]
    if missing:
        print(f"Missing trainer files in combined/: {', '.join(missing)}", file=sys.stderr)
        return 1
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir(parents=True)
    for name in names:
        shutil.copy2(TRAINER / name, PUBLIC / name)
    print(f"public/: {len(names)} files ({', '.join(names)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
