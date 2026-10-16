# MATHCOUNTS Lab · Weeks 1 + 2

Week 1 number theory and Week 2 algebra now run together in one trainer.

From this folder:

```sh
python3 mathcounts.py
```

The browser opens at <http://127.0.0.1:8000>. Keep the terminal running; press
Ctrl+C to stop. Requires Python 3.9 or newer, with no additional packages.

The self-contained `combined/` folder contains all lessons, explorers, 90 authored
questions, 30 fresh-question templates, and shared practice and assessments.
Choose both weeks, a single week, or an individual topic.

See [combined/README.md](combined/README.md) for details, saved-progress behavior,
and verification commands. The original `week 1/` and `week 2/` folders remain
available as the standalone versions.

## Deploy on Vercel

The same trainer also runs as a website. `combined/` stays the single source of
truth: the build copies its browser files to Vercel's CDN, and the practice API
runs as one Python function importing the same question bank, generators, and
grading that the local server uses.

- `vercel.json` sets the build command, the output directory, and the rewrite
  that sends every `/api/<endpoint>` request to the function.
- `api/index.py` is that function.
- `scripts/build_static.py` copies the files named in the server's asset
  allowlist into `public/`. Nothing else is published: the question bank and
  its answers stay inside the function, just as the local server keeps them off
  its explicit asset list.
- `scripts/dev_vercel.py` reproduces that split locally, so routing problems
  appear before a deployment rather than after one:

```sh
python3 scripts/dev_vercel.py
```

### Put the repository on GitHub

Create an empty repository on GitHub, with no README, `.gitignore`, or license,
then from this folder:

```sh
git remote add origin https://github.com/YOUR-USERNAME/mathcounts.git
git push -u origin main
```

### Import it on Vercel

1. Sign in at <https://vercel.com/new> with that same GitHub account.
2. Import the `mathcounts` repository.
3. Change no build settings. `vercel.json` supplies the framework, build
   command, output directory, and routing; Vercel reads Python 3.12 from
   `.python-version` and installs no packages, because the trainer still
   depends only on the standard library.
4. Deploy. The trainer opens at the deployment's URL.

Every later push to `main` deploys again, and each pull request gets its own
preview URL.

Progress still saves in each visitor's own browser, so students on different
computers keep separate progress, and the deployed trainer still has no teacher
dashboard or shared database. The standalone `week 1/` and `week 2/` folders
are not part of the website; run those locally.
