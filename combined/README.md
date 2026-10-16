# MATHCOUNTS Lab · Weeks 1 + 2

One local, dependency-free trainer combining the complete Week 1 Remainder Lab
and Week 2 Algebra Lab. All practice problems are original.

## Start

Requires Python 3.9 or newer and a modern browser. No packages, accounts,
API keys, or internet connection are needed.

From this folder:

```sh
python3 mathcounts.py
```

From the parent `mathcounts` folder, use its launcher:

```sh
python3 mathcounts.py
```

Or start this folder directly:

```sh
python3 combined/mathcounts.py
```

The browser opens at <http://127.0.0.1:8000>. Keep the terminal running and press
Ctrl+C to stop. Use `--port 8001` if port 8000 is occupied, `--port 0` for an
available port, or `--no-browser` to print the URL without opening it.

Open the printed URL; opening `index.html` directly cannot connect to Python.
The server binds to `127.0.0.1` and serves an explicit list of website assets.

## Both weeks in one place

- **Start here:** the course overview and a suggested 45-minute Week 1 lesson.
- **Week 1 · Number theory:** remainders, congruence classes, modular clock,
  power cycles including transient prefixes, and solving congruences.
- **Week 2 · Algebra:** its 60-minute lesson plan, algebra foundations, systems
  of equations, quadratics, and algebraic identities. Lessons retain worked
  examples, common mistakes, discussion prompts, and printing.
- **Contest practice:** all **90 authored problems** and **30 stable seeded
  templates**, across **10 topics** and Warm-up, Contest, and Stretch levels.
  “Remainder foundations” and “Algebra foundations” are separate topics.

Guided practice and assessments can include **both weeks**, **Week 1 only**,
**Week 2 only**, or one topic. Selecting “All topics” balances assessment topics.
The bank contains 60 Week 1 and 30 Week 2 questions. Both-week assessments balance
the 10 topics rather than promising an equal number of questions from each week.

Assessments retain 5/10/20-question sets, mixed/fresh/authored sources, optional
5/10/20/30-minute timers, optional strategy choices, saved answers, topic reports,
worked solutions, and guided review of missed questions. Guided practice retains
three hints, immediate grading, fresh generation, and first-try credit.

Number theory explorer limits remain unchanged: moduli 1–120, integer inputs
up to ±1 billion, clock operands up to ±1 million, and exponents 0–1 billion.
The power explorer excludes 0^0. Algebra explorer coefficients range from −100
to 100; solutions may be exact fractions or radicals. Practice answers are integers.

## Saved progress

Combined progress, fresh practice, assessment answers, and the last 10 reports
save in this browser. Timed assessments keep their absolute deadlines during
navigation, reloads, and closing the tab. Scores distinguish numeric answers
from strategy choices. Revealing a solution before solving earns no solve credit.

On first use, the combined trainer imports available progress and completed
reports from both standalone trainers on the **same browser and origin**
(the same host and port). It preserves original question IDs and generated-ID
formats, so old hints, answers, and grading still work. If both weeks have
unfinished assessments, it resumes the earliest deadline and keeps the other
under “Unfinished assessments from your earlier weeks” in assessment setup.

Browser storage from another port or browser is inaccessible; it is not imported.
The standalone trainers' storage remains intact. Import happens once, so resetting
combined progress does not restore old progress on the next reload. Use
**Reset progress** and **Clear assessment history** before a new student starts.
This is a local trainer with no teacher dashboard or shared database.

## Verify or customize

From this folder:

```sh
python3 -m unittest -v test_combined.py
node --test test_assessment.js test_storage.js
```

Node is optional and is not needed to run the trainer. The Python checks cover
the complete merged bank, stable generators, grading, every week/topic/source/
difficulty combination, both explorer families, and HTTP routes. Frontend tests
cover saved answers, absolute deadlines, retry behavior, and migration of progress,
reports, and two unfinished assessments.

`mathcounts.py` is the shared server and practice API. `questions.py` and
`question_generator.py` combine the original bank and generator modules.
`explorers.py` supplies the algebra calculations. The browser shares one practice
engine and navigation, with the Week 2 lessons and graphs alongside Week 1 visuals.
Keep version-1 generator builders stable so saved IDs remain reproducible.

Copy this entire folder to share the trainer; it does not depend on either original
week folder or on the PDF worksheets in the parent directory.
