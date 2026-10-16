#!/usr/bin/env python3
"""Launch the combined Week 1 and Week 2 trainer."""
import runpy
import sys
from pathlib import Path

if __name__ == "__main__":
    trainer = Path(__file__).resolve().parent / "combined"
    sys.path.insert(0, str(trainer))
    runpy.run_path(str(trainer / "mathcounts.py"), run_name="__main__")
