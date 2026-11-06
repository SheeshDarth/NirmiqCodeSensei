# Production Upgrade Roadmap — Road to Publish, Grow, Pitch

> Post-1.0 strategic roadmap. `MEGASPRINT_ROADMAP.md` got us to a working 1.0;
> this gets us to a *published, growing, defensible* product. Every phase ships
> as working software behind the green gate (lint → typecheck → build → test) —
> no big-bang, no half-wired features. Written 2026-07-22.

---

## North star

**Everyone else makes reading code faster. We are the only tool that checks whether you
actually understood it.** The research backs the wedge: Copilot measurably does *not* improve
comprehension of a legacy codebase (arXiv 2511.02922); the *verification loop* is the strongest
behavioral predictor of comprehension; 38.8% of Copilot-generated programs shipped security
flaws (arXiv 2206.15331). Competitors (DeepWiki, Sourcegraph, Greptile) all *deliver
explanations* — the exact intervention research shows produces the *illusion* of learning.

## The three bars (they are different, and gated on different things)

| Bar | Blocker | Unlocked by |
|---|---|---|
| **Publish (OSS)** | slow first run; untested publish guard; unpublished | **P0** |
| **Grow users** | no time-to-aha; no onboarding; nothing shareable | **P1** |
| **Pitch (startup)** | the core claim ("you'll understand it") is unproven | **P3 instrument → P6 evidence** |

## Sequencing principle

Order by *what unblocks the next thing*, not by what's fun. Perf before publish (first
impressions are permanent). Observability before users (you can't support what you can't see).
The **calibration instrument (P3) is built early but harvested late** — it's the only asset that
produces the sentence an investor can't dismiss: *"users went from X% to Y% accuracy."*

---

## P0 — The credibility floor (ship 1.0.0, and make it not embarrassing)

**Goal:** a published, fast-enough, self-protecting 1.0 that a stranger can `npx` without a bad
first impression. You cannot grow or pitch an unpublished, hanging tool.

**Deliverables**
1. **AST single-pass refactor** — the first-impression fix. Today: measured **4–6 s / 123
   files** vs a documented **<2.5 s** budget; ~3.9M node visits because 8 detectors +
   `computeFunctionMetrics` each do a full `walkAst`, and three re-walk per function. Merge into
   **one** visitor that dispatches on `node.type` and updates all detector state together.
   Files: `lib/services/code-analyzer.service.ts` (`scanFindingsAst`, `detectRecursion`,
   `detectStackQueue`, `detectHeap`, `detectLinkedList`, `detectObserver`, `detectSingleton`,
   `detectFactory`, `detectBacktracking`, `computeFunctionMetrics`). Add a benchmark test that
   asserts a ceiling (guards regression). Target **≥5× on the AST phase**.
2. **Finish Feature Trace step 6 (calibration)** — see P3; the mechanic ships here because it's
   nearly built and is the single highest-leverage asset.
3. **Publish-guard test** — `scripts/pack-standalone.mjs`'s forbidden-content check is the only
   thing stopping the live DB / `.env` from reaching npm, and it has **zero tests**. Refactor the
   script to export its predicate, then test it fires on a planted `.db` / `.env` / `.node`.
4. **`session_logs (workspace_id, created_at)` index** — but ⚠️ **declare the existing 0004
   index in `schema.ts` first** (schema declares no indexes, so `db:generate` may emit a DROP).
5. **Tag + provenance publish** — a `.github/workflows/release.yml` that runs the gate then
   `npm publish --provenance --access public` on a `v*` tag (`id-token: write`). SBOM attached
   to the Release. Then **you** tag `v1.0.0` and push (outward-facing, maintainer-only).

**Exit criteria:** `npx nirmiqcodesensei@1.0.0` into an empty dir → analysis of a mid-size repo
completes in a time that doesn't read as "hung"; gate green; provenance badge live on npm;
publish guard has a test.

**Effort:** 3–4 sessions. **Reuses:** everything — this is hardening, not new surface.

---

## P1 — Time-to-aha (the growth unlock)

**Goal:** in the first 60 seconds, show the user something they *didn't know about their own
code* — before they've read a single tab. Today the flow is import → wait → browse seven tabs,
with no single "wow" moment. Growth is blocked here, not on features.

**Deliverables**
1. **The hero insight.** On import completion, land the user on **one** auto-selected Feature
   Trace with a headline: *"Inspect this feature’s dependencies and possible calls, with risk findings attached to their source."* This is the screenshot people share. Feature Trace is the hero because
   "which dependencies and possible calls support an inspected feature, with explicit uncertainty" is legible to a stranger.
2. **A bundled demo project** so a user can see value **without importing their own repo** —
   removes the biggest activation drop-off (no repo handy / privacy hesitation on first run).
   Ship a small, interesting sample project + a "Try the demo" button on the empty dashboard.
3. **Onboarding flow** — a 3-step first-run: import (or demo) → hero insight → "answer one
   question about it." First value *and* first verification in under a minute.
4. **Shareable artifact** — an "Export this trace as an image/markdown" that produces something
   postable (redacted of absolute paths). Distribution = the artifact people share.

**Exit criteria:** a first-time user, given only the binary, reaches a genuine insight about the
demo project in <60s without instruction, and can share it.

**Effort:** 3–4 sessions. **Reuses:** Feature Trace (P0), the export service, the graph.

---

## P2 — Observability without telemetry (the operational floor)

**Goal:** keep the zero-telemetry promise *and* be able to support users. Right now when
analysis fails on someone's repo, `console.warn` goes to a terminal you'll never see — that's a
promise that's also an operational blind spot.

**Deliverables**
1. **Diagnostic report** — a "Copy diagnostic" button producing a PII-free, path-redacted
   summary (stack detected, file count, which lens/phase failed, versions, OS/Node) the user
   *chooses* to paste into an issue. Privacy-preserving because the user is the transport.
2. **In-app failure surfacing** — when the best-effort analysis block degrades (missing graph /
   Deep Review / traces), say so in the map summary the way `analysisTruncated` already does,
   instead of a silently thinner result.
3. **Self-check** — a "health check" that runs the analyzer on a known fixture and reports
   pass/fail, so a user (or you) can tell "is it me or the tool?"

**Exit criteria:** a user who hits a failure can hand you a one-click report that actually lets
you reproduce it, with no telemetry added.

**Effort:** 2 sessions. **Reuses:** senior-review truncation pattern, the error paths fixed in
`a22d5db`.

---

## P3 — The calibration instrument → evidence (the pitch asset)

**Goal:** turn "you'll understand your code" from a claim into a **number**. This is the only
asset a competitor can't ship in a sprint and an investor can't wave away. Built here; *harvested*
in P6.

**Deliverables**
1. **Predicted-vs-actual, per workspace** — capture the learner's confidence *before* they see
   the answer (Feature Trace "predict the next hop", Explain-Back "predict your confidence"),
   compare to actual `score`/`confidence`. Store `predictedConfidence` on the question row (the
   deferred Lead-and-Reveal migration). Surface **over-confident / aligned / under-confident**.
2. **Progress over time** — a lightweight per-workspace timeline of calibration + answered
   questions. This is the retention half the product currently has *zero* of (no scheduler, no
   time series).
3. **The metric** — one workspace-level number: *"your understanding accuracy: 62% → and here's
   where the gap is."* That sentence, aggregated across real users, IS the pitch.

**Exit criteria:** the app can state, for a real workspace, "you believed you understood N
things; you actually did M of them," with the delta stored over time.

**Effort:** 3 sessions (Feature Trace step 6 is the down-payment). **Reuses:** `explain-back`
service + `confidence` field (already stored, never used for calibration), `progressScore`.

---

## P4 — Robustness at real-world scale (users import repos you didn't design for)

**Goal:** survive contact with codebases larger, weirder, and less TS/JS-shaped than the fixture.
This is where "impressive demo" becomes "reliable tool."

**Deliverables**
1. **Bigger repos** — `MAX_FILES=300` is a hard truncation; a real Next app blows past it. Make
   truncation *smart* (rank-and-keep the load-bearing files via PageRank, not first-300), and
   lean harder on the incremental fingerprint so re-analysis is cheap. Surface "analyzed 300 of
   1,842 — here's why these" honestly.
2. **Monorepos** — detect workspaces/packages and let the user scope analysis to one.
3. **Language breadth** — the AST path is TS/JS-only; everything else is regex. Add real parsing
   for at least Python (the other vibe-coder-heavy language) via a pluggable parser seam. Keep it
   optional/degrading — never a hard dependency.
4. **Graceful degradation everywhere** — a broken file, a giant file, a binary mislabeled as
   source, a symlink farm: each should skip-and-note, never crash the import.

**Exit criteria:** importing 5 real-world open-source repos of varying size/language/shape all
produce a useful result and never a crash.

**Effort:** 4–5 sessions. **Reuses:** the walk, PageRank, `computeSourceFingerprint`, the
symlink confinement from `86faa6e`.

---

## P5 — Distribution & positioning (go-to-market surface)

**Goal:** lower the install friction and say the right thing to the right buyer.

**Deliverables**
1. **Desktop installer** — `npx` is friction for non-CLI users; a signed Electron/Tauri wrapper
   (the app already runs a local server + browser UI) removes it. Spike first, commit later.
2. **Positioning** — reframe from *"comprehension test"* (true but unwelcome) to **"onboarding
   accelerant"** / *"own the code your AI wrote."* Same product, a message people opt into. The
   buyer is likely **not** the vibe coder — it's the eng manager who inherited an unowned
   codebase, or a bootcamp/university.
3. **Landing page + 90-second demo video** — the hero insight (P1) is the demo.
4. **Model decision** — local-first caps monetization (no usage pricing, no network effects).
   Decide the wedge: OSS core + paid team/education tier? BYOK stays free forever; the paid layer
   is *aggregated calibration analytics for a team/cohort* (which needs an opt-in sync — a real
   architecture decision, log it in the council).

**Exit criteria:** a stranger can find it, understand who it's for in one sentence, and install
it in one click.

**Effort:** 4–6 sessions + design help. **Reuses:** the standalone server, README/brand work.

---

## P6 — Validation → the company/no-company decision

**Goal:** stop guessing. Get the product in front of real people and measure the two things that
matter: **time-to-aha** and **calibration lift**.

**Deliverables**
1. **10 real users** — not friends being nice; people who import their own AI-built project.
2. **Instrument the funnel** (opt-in, local, exportable): activation (did they reach the hero
   insight?), calibration delta (P3), retention (did they come back?).
3. **The decision** — with data: is this a beloved OSS tool, a bootcamp/edu product, or a
   venture-scale company? The honest counter is that **developer education is a graveyard** —
   devs don't reliably pay to learn. The data tells you which of the three it is; don't decide
   before it does.

**Exit criteria:** a written go/no-go backed by real usage numbers, logged as a council review.

**Effort:** ongoing, weeks of calendar time. **Reuses:** P3 instrument, P2 diagnostics.

---

## What NOT to build (kill on sight)

- **Runtime tracing / executing the imported project.** It destroys the entire "nothing runs,
  nothing leaves" promise. The moat is that you *don't* do this. Hard no.
- **Cloud analysis / hosted mode** *before* P6 says the market wants it. It trades the moat for
  a commodity and invites the incumbents onto your turf.
- **A learner model / knowledge tracing / adaptive sequencing.** That's an ITS research program,
  not a feature. Calibration is one arithmetic comparison; keep it that way until users demand
  more.
- **LLM-graded free-text as the default.** Breaks offline-first and adds grading you can't
  validate. AI stays optional enrichment.
- **DB indexes generally** (both prior review agents agreed they don't matter at current scale —
  except the one `session_logs` index in P0).
- **Splitting the big analyzers.** `senior-review.service.ts` / `code-analyzer.service.ts` are
  the most cohesive files in the repo; splitting buys only import churn.

---

## The honest risks (a good investor will raise these — have answers ready)

1. **Dev education is a graveyard.** → Your buyer isn't the learner; it's the manager/institution
   who needs *someone* to own an unowned codebase. Position for them.
2. **Local-first caps the business model.** → The paid layer is *team/cohort calibration
   analytics*, which needs opt-in sync — a deliberate, logged architecture decision, not a pivot.
3. **The message is unwelcome** ("you don't understand your own code"). → Sell the outcome
   (ownership, faster onboarding), not the diagnosis.
4. **Defensibility.** Cursor can ship "explain this path" in a sprint. → The moat is the
   *assessment loop* and *accumulated calibration data*, never the analysis. Build the data asset.

---

## Immediate next 3 actions (in order)

1. **AST single-pass refactor** (P0.1) — removes the worst first impression; ~1 session; the one
   thing every user *feels*.
2. **Feature Trace step 6 = calibration** (P0.2 / P3 down-payment) — reframe it as *the
   instrument*, not a feature. It's the only thing here that generates the pitch sentence.
3. **Publish-guard test + `release.yml` + tag v1.0.0** (P0.3–0.5) — get it published with
   provenance so the growth and validation work has something real to point at.

Everything else sequences off these three.


## Guided Learning Map implementation note — 2026-10-28

LEARNING_MAP_MASTER_PLAN.md supersedes the earlier Feature Trace presentation and unsupported runtime-flow copy. Guided walkthroughs, bounded source access, immutable local rubric assessments and editable study prerequisites are implemented and technically checked. The original roadmap's predicted-confidence calibration and empirical learning-effectiveness claims are not established by those self-assessments; human trials remain pending.
