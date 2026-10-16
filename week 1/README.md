# Week 1: Remainder Lab

A Python-powered modular arithmetic trainer for middle-school MATHCOUNTS preparation. All practice problems are original, rather than official competition questions.

## Start the trainer

Requires **Python 3.9 or newer** and a modern browser. No packages, accounts, internet connection, or API keys are needed.

From this folder:

```sh
python3 modular_arithmetic.py
```

From the parent `mathcounts` folder:

```sh
python3 "week 1/modular_arithmetic.py"
```

The browser opens automatically at <http://127.0.0.1:8000>. Keep the terminal running. Press **Ctrl+C** in the terminal to stop. If the browser does not open, use the URL printed in the terminal.

Open the trainer through that URL; opening `index.html` directly will not connect to the Python calculations.

If port 8000 is busy:

```sh
python3 modular_arithmetic.py --port 8001
```

Use `--no-browser` to suppress automatic browser opening, or `--port 0` to select an available port.

## Activities

1. **Remainders:** enter `a mod n`; see equal groups, a number line, and `a = qn + r`. Negative numbers use the least nonnegative remainder.
2. **Congruence classes:** compare two numbers and inspect the complete set of residue classes. The default demonstrates `17 ≡ 2 (mod 5)`.
3. **Modular clock:** animate addition, subtraction, and repeated hops for multiplication. Positions are `0` through `n − 1`; an ordinary 12-hour clock labels position 0 as 12.
4. **Power cycles:** detect the full repeating cycle, show any transient prefix, and evaluate exponents up to one billion. Try `2^100 mod 7`, then `2^50 mod 8`. The latter has prefix `2, 4` and cycle `0`.
5. **Congruences:** solve `ax ≡ b (mod n)` and highlight every valid residue. Includes one solution, several solutions, no solutions, zero coefficients, and modulus 1. Cancellation divides the modulus as well as both sides.
6. **Contest practice:** 60 authored questions plus 18 randomized problem types across Foundations, Cycles, Congruences, Digits, Counting, and Word problems. Choose randomized assessments or guided practice with hints and worked solutions. **Random problem** picks an authored question; **Generate a fresh problem** creates a new variant on demand.

Each explorer includes example buttons and a discussion question with an expandable explanation. Moduli range from **1 through 120** to keep visualizations readable. General integer inputs range from **−1 billion through 1 billion**; clock operands range from **−1 million through 1 million**. Exponents range from 0 through 1 billion; `0^0` is deliberately excluded.

## Random assessments

In **Contest practice → Random assessments**, choose **5, 10, or 20 questions**, a topic, a difficulty, and an optional time limit of **5, 10, 20, or 30 minutes**. The default is 10 questions from Contest and Stretch levels with a 10-minute limit. These are training formats, not official MATHCOUNTS rounds.

- Choose a **Question source**: **Mixed: authored + fresh** (the default), **Fresh questions only**, or **Authored problems only**. Mixed sets use roughly half fresh questions, filling more with fresh variants when the filtered bank is small. Fresh-only sets create the entire assessment when you start.
- Sets avoid repeated prompts and balance topics when **All topics** is selected. Authored-only sets are limited to the available bank; the app shows the actual count before starting. Generated sets can provide all 20 questions even for one topic and difficulty. A pattern or exact question may appear again in a later assessment.
- Numeric answers are the default. Turn on **Include a strategy-choice step** to also assess shortcut selection; those choices are shuffled. Strategy scores are reported separately from numeric-answer scores.
- Answers and the current question save automatically in this browser. Use the navigator to revisit any question. Blanks count as skipped. Hints, correctness feedback, and solutions appear after submission.
- A timed set uses an absolute deadline, so time continues when students switch activities, close the tab, or reload. When the deadline passes, the app submits the saved answers while open, or upon reopening. If Python is unavailable, answers remain saved and grading can be retried.
- The report includes the numeric score, percentage, skipped count, topic breakdown, and a worked solution for every problem. **Practice missed questions with hints** opens the missed and skipped items in guided practice.
- The last **10 assessment reports** stay in browser storage and can be reopened from the setup page. **Clear assessment history** removes completed reports before another student uses the browser. Guided-practice credit is separate.

The expanded bank includes missing digits, long repeated numbers, factorial sums, calendar schedules, packaging problems, overlapping divisibility conditions, counting residue classes in ranges, inverse problems, and power patterns with both prime and composite moduli.

## Questions generated on demand

Python's random-number generator chooses a problem type and its numbers. Each of the six topics has a Warm-up, Contest, and Stretch generator. Examples include units digits of large powers, repeated two-digit blocks modulo 11, multiples satisfying a remainder condition, the number of solutions to a congruence, counting square residue classes, and coin-grouping word problems.

These are **checked templates with random parameters**, so new numbers come with corresponding answers, three hints, strategy choices, and a worked solution. The generators avoid ambiguous missing digits and enforce the mathematical conditions needed by their shortcuts. They do not invent an unlimited variety of new problem structures.

In guided practice, select a topic and level and click **Generate a fresh problem**. **Generate another** makes another variant. **Back to authored problems** returns to the bank. The current fresh question saves across reloads. Fresh-question solves are counted separately from the 60-question bank; first-try credit includes both sources.

Generated IDs contain a version, template name, and seed. The server reconstructs the same question for hints and grading after a restart; no in-memory question registry is required. Keep the version 1 builders unchanged when adding future generator versions so saved assessments continue to work.

## A suggested 45-minute lesson

- **0–8 minutes:** remainders and classes. Have students predict results before calculating, including one negative input.
- **8–15 minutes:** the modular clock. Compare ordinary arithmetic with reduced operands; explain why a full turn changes nothing.
- **15–25 minutes:** power cycles. Explore `2^k mod 7` and units digits. Contrast these with `2^k mod 8`, where the cycle begins after a prefix.
- **25–33 minutes:** congruences. Compare `3x ≡ 5 (mod 7)`, `4x ≡ 6 (mod 10)`, and `4x ≡ 5 (mod 10)`.
- **33–45 minutes:** contest practice. Ask students to explain why their chosen shortcut saves work. Use Warm-up for beginners and Stretch for students ready for gcd reasoning or inverse pairs.

“Fastest approach” means the recommended efficient choice among the offered methods. Other valid solutions are welcome. Small congruences can also be solved quickly by inspection; the inverse method prepares students for larger examples.

## Student progress

Progress is stored in the current browser's local storage. A problem counts as **solved** only when a student answers correctly before revealing its solution. **Both steps right on first try** requires the recommended method and answer on their first attempts, without hints. Revealing a solution before solving does not earn credit. Use **Reset progress** before a new student uses the same browser. If storage is disabled, activities still work and progress lasts for the page session.

The app binds to `127.0.0.1`, so each student's computer runs its own copy. It has no teacher dashboard or shared score database. Keep `modular_arithmetic.py`, `questions.py`, `question_generator.py`, `index.html`, `style.css`, `assessment.js`, and `app.js` together when copying it.

## Check or customize the code

```sh
python3 -m unittest -v test_modular_arithmetic.py test_question_generator.py
```

The 30 Python tests check arithmetic, all 60 authored answers, assessment selection and grading, local HTTP routes, and **5,400 generated variants** against independent calculations. They also check unique missing digits, all topic/difficulty combinations, mixed/fresh/authored sources, and deterministic reconstruction in a new Python process.

Optional frontend state tests use Node.js's built-in test runner (Node is not needed to run the trainer):

```sh
node --test test_assessment.js
```

These ten tests cover saved-answer resumption, absolute deadlines, automatic submission, validation, duplicate-submit protection, grading retries, question-source availability, and saved generated questions.

The calculations and server are in `modular_arithmetic.py`; the editable authored bank is in `questions.py`; the seeded generators are in `question_generator.py`; the browser interface is in `index.html`, `style.css`, `app.js`, and `assessment.js`. New questions need a unique ID, title, topic, level, prompt, unit, four method choices, the zero-based recommended method index, a numeric answer, three hints, a method explanation, and a worked solution. Add independent answer checks when adding questions or generators.
