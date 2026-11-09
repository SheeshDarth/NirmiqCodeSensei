# Changelog

All notable changes to NirmiqCodeSensei are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — unreleased

First public release (not yet tagged or published; the date is set when the tag is pushed).
NirmiqCodeSensei is a local-first learning OS: point it at a project
and it produces a learning map, an 8-lens senior-engineer review, a code-grounded DSA
breakdown, and explain-back questions. It binds to 127.0.0.1, stores everything in a local
SQLite database, and sends no telemetry.

```bash
npx nirmiqcodesensei@latest
```

### Added

- **Installable distribution.** `npx nirmiqcodesensei` runs the app on a machine that has
  never seen the repo. The published package carries a prebuilt Next.js standalone server;
  native modules resolve per-platform at install time, so one tarball serves Windows, Linux
  and macOS. Aliases: `codesensei`, `nirmiq`.
- **MCP server in the published package** (`npx nirmiqcodesensei mcp`) — 15 tools over stdio
  for Claude Code, Cursor and Windsurf. Bundled at pack time, so no dev toolchain is needed.
- **Import & analysis.** Local path or GitHub URL → learning map, architecture graph,
  code-grounded DSA concepts, explain-back questions. Offline by default; an optional
  `ANTHROPIC_API_KEY` enriches the analysis and sends only computed findings, never source.
- **8-lens senior review** with an overall grade, scored on code *density* rather than project
  size, plus an incremental re-analysis path that skips unchanged sources.
- **Learning surfaces:** knowledge graph, explain-back with confidence tracking, DSA bridge,
  debug lab, daily log, session log, BM25 search, and Markdown export of the whole pipeline.
- **Data ownership:** the database lives in `data/` in the directory you launch from — your
  project, not the install — and can be downloaded as a backup at any time.
- `CHANGELOG.md`, and a scaling-N/A architecture decision (REVIEW-013) recording that
  horizontal scaling is a deliberate non-goal for a single-user local-first tool.
- **Guided code walkthroughs.** The Learning Map now leads with step-by-step paths through the
  code, a bounded read-only source viewer (content-hash checked), bounded static call
  resolution through the TypeScript compiler, an editable study path, and decision records.
  Paths are static evidence, not observed execution, and the UI says so.
- **Diff Quiz.** One click (or the `ncs_diff_context` / `ncs_diff_quiz` MCP tools) turns what
  your AI just changed — uncommitted work, new files, or the latest commit — into explain-back
  questions. Offline; secret-looking lines are redacted.
- **Calibration.** Predict how well you will explain something *before* the key points are
  revealed; the app compares that with a key-point coverage score. Coverage is a keyword
  heuristic, not a grade of correctness, and no learning-effectiveness claim is made.
- **Review queue.** Answered questions come back for review on a fixed schedule based on
  how the last answer went (1 day weak, 3 shaky, 7 solid). It is a simple fixed-interval
  reminder derived from stored data, not an adaptive spaced-repetition algorithm.
- **Demo and onboarding.** "Try the demo" builds a small built-in project into a full
  workspace offline, with hand-written code-grounded questions, plus a stateless first-run
  checklist.
- **Release hardening.** The publish guard is its own tested module, and tagged releases are
  published by a workflow with npm provenance and an attached SBOM.

### Fixed

Found by installing the real tarball into an empty directory — each would have shipped a
broken or unsafe 1.0:

- Next.js file tracing copied `data/` into the build output — the local database *and* the
  user's imported projects, including their `.git` history. Publishing would have leaked
  third-party source. The bundle is now filtered at copy time and the build hard-fails if a
  database, dotenv file, git history or native binary reaches it.
- The standalone server `chdir`s to its own directory, so a published install resolved the
  database to `node_modules/…/dist/data/`. Every `npx …@latest` would have silently destroyed
  the user's learning history. The launcher now pins the data directory to your working
  directory.
- The standalone server defaulted to `0.0.0.0`, exposing a 127.0.0.1-only product across the
  local network. The launcher pins the loopback interface.
- The repo's own `.gitignore` was traced into the bundle; npm honours nested ignore files, so
  the Next runtime and compiled app were dropped from the tarball — a package that installs
  and cannot boot.
- Turbopack requires external packages by a hashed name, so removing the build machine's
  `better-sqlite3` made every request fail with `Failed to load external module`.
- The MCP server printed its banner to stdout, corrupting the JSON-RPC stream that stdio
  transport requires; it now goes to stderr.
- Install paths containing spaces (`C:\Program Files\…`) broke the launcher.

### Security

- Ingests private source safely: symlink-confined tree walk, shell-free git, realpath and
  credential-directory blocks, per-file size caps. Self-scanned security lens: **A/100**.
- Production CSP drops `unsafe-eval` (dev-only). CI gates on critical `npm audit` advisories.
- No telemetry, no analytics, no cloud dependency.

### Known limitations

- "Quiz me on my latest changes" appears only when the project folder is a git repository;
  the demo project is not one.
- Image optimisation needs the optional `sharp` dependency; without it Next serves unoptimised
  images.
- macOS is untested in CI (Windows + Linux are covered); it is expected to work via the same
  per-platform native resolution.

[1.0.0]: https://github.com/SheeshDarth/NirmiqCodeSensei/releases/tag/v1.0.0
