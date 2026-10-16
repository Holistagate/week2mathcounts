# Week 2: Algebra Lab

A separate, dependency-free algebra website for middle-school MATHCOUNTS preparation. Existing Week 1 files are unchanged. All practice problems are original, not official competition questions.

## Start

Requires Python 3.9 or newer and a modern browser. No packages, API keys, accounts, or internet connection are needed.

From the repository root:

```sh
python3 "week 2/algebra.py"
```

Or, from this folder:

```sh
python3 algebra.py
```

The trainer opens at <http://127.0.0.1:8000>. Keep the terminal running and use Ctrl+C to stop. If Week 1 is already using port 8000, use `python3 algebra.py --port 8001`. Use `--no-browser` to avoid automatic opening or `--port 0` for an available port.

Open the printed URL; opening index.html directly will not connect to Python. This app runs on the student's own computer. It has no shared teacher dashboard or score database.

## Material

1. **Start here:** learning goals, sequence, and a 60-minute lesson plan. For a group still learning the basics, use two meetings; treat the later techniques as extensions.
2. **Algebra foundations:** expressions versus equations, distribution, signs, like terms, balancing both sides, and clearing denominators. The explorer handles a unique solution, no solution, and every real x.
3. **Systems of equations:** substitution, scaled elimination, direct computation of the requested expression, and word problems. The explorer shows exact fractional solutions, checks both original equations, and graphs the lines. Includes dependent, inconsistent, and degenerate equations.
4. **Quadratics:** factoring, zero-product rule, both square roots, completing the square, context restrictions, the quadratic formula, discriminant, and root sum/product relationships. The explorer graphs the polynomial and gives exact roots, with decimal approximations labeled when needed. Setting a = 0 demonstrates the linear or constant case.
5. **Algebraic identities:** differences of squares and cubes, squares of binomials, sums of cubes, and expressions determined by x + y and xy. An area diagram explains 2xy. Lessons cover cancellation restrictions and common errors.
6. **Contest practice:** 30 authored questions (6 foundations, 9 systems, 9 quadratics, 6 identities) and 12 seeded templates, one per topic and difficulty. Guided practice has strategy choices, three hints, numeric grading, and worked solutions. Random assessments support 5/10/20 questions, topic and level filters, mixed/fresh/authored sources, optional strategy choices, and optional timers.

Every practice question asks for a single integer, including questions with fractional intermediate values. Explorer coefficients are integers from −100 to 100; explorer answers can be fractions or radicals. Generated questions vary checked structures and numbers; they do not invent unlimited new problem types.

## Saved progress

Guided practice, the current fresh question, assessment answers, deadlines, and the last 10 assessment reports save in this browser. Week 2 uses separate storage keys from Week 1. A deadline continues during reloads and tab changes; expired assessments submit on reopening. Numeric and strategy scores are separate. Use **Reset progress** and **Clear assessment history** before another student uses the same browser. A revealed solution does not earn a solve; first-try credit requires both steps correct without hints.

Lessons include **Print this lesson**, which expands worked examples before opening the print dialog. Internet access is unnecessary after copying the folder.

## Verify

From this folder:

```sh
python3 -m unittest -v test_algebra.py
node --test test_assessment.js
```

Python tests independently check all 30 authored answers, 1,800 seeded variants, quadratic roots, exact system solutions, degenerate equations, identities with negative values, every assessment filter/source combination, and HTTP routes. Node tests cover saved answers, absolute deadlines, grading retries, and submission behavior. Node is optional and is not needed to run the website.

Keep all website files in this folder together. algebra.py serves an explicit asset allowlist, so local worksheets and Python files are not exposed. questions.py is the authored bank, question_generator.py holds stable version-1 generators, explorers.py holds exact arithmetic, and the HTML/CSS/JavaScript files render the interface. Keep version-1 generators stable so saved question IDs remain reproducible.
