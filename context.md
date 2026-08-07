# Session Handoff — NirmiqCodeSensei

> Working context for continuing in a fresh chat. Written 2026-07-22.
> Read this first, then `CLAUDE.md` for standing rules.

---

## 1. Where the project stands

- **Repo:** `C:\Users\Siddharth\Desktop\NirmiqCodeSensei` (branch `master`, in sync with
  `origin/master`). Note: the older path `C:\NirmiqLearnOS` no longer exists — same repo, moved.
- **Version:** `package.json` = **1.0.0**. **No git tag, not published to npm.** The name
  `nirmiqcodesensei` is **available** on the registry (verified `E404`); `npm whoami` = not
  logged in.
- **Gate (green as of the last commit):** `npm run lint` → `npm run typecheck` →
  `npm test` (**34/34**) → `npm run build`.
- **Megasprints MS1–MS7 complete** (`docs/MEGASPRINT_ROADMAP.md`). Council decisions in
  `docs/COUNCIL_REVIEW_LOG.md`; latest is **REVIEW-015**.

---

## 2. What this session changed (all pushed)

| Commit | What |
|---|---|
| `cb33bba` | Pinned patched `hono` ≥4.12.25 via overrides — clears the one high `npm audit` advisory (transitive via MCP SDK, unreachable on stdio) |
| `cf3c3b3` | **GitHub import fix** — reproduced: URLs with a trailing slash, `/tree/main`, `www.`, or SSH form failed the strict regex, then fell through to "local path" so cloning never ran. Added `normalizeGitHubUrl()`, git preflight, shallow clone |
| `a59a1e9` | **DSA Bridge reframed** — leads with code-grounded findings grouped by category; generic stack concepts demoted to a collapsible. Card splits into *The core concept* / *How it shows up in your code* / *What it's doing here* |
| `b3e3147`, `02af64e`, `2e40dda` | **Repo polish** — README badges, CONTRIBUTING, CODE_OF_CONDUCT, PR template, 2 issue forms; repo description + homepage + 14 topics set via `gh` |
| `970c85c` | **HIGH security** — path traversal: `github.com/owner/..` gave `repoName=".."`, escaping the clone dir; `git pull` could then run elsewhere. Reachable via MCP |
| `f1acb5d` | **Release blocker** — `npm run build` had stopped emitting `.next/standalone/server.js`; a stray home-dir `package-lock.json` made Next infer the wrong workspace root. Pinned `outputFileTracingRoot` + `turbopack.root` |
| `5ab31cd` | **HIGH data loss** — "Refresh analysis" deleted every answer the learner had written (`userAnswer`/`score`/`confidence` live on the wiped question row). Now snapshotted and re-attached; progress recomputed |
| `86faa6e` | **HIGH security** — `readKeyFiles`/`getFileTree` followed symlinks/Windows junctions, so a crafted repo leaked an unrelated tree **into the AI prompt**. Added `isInsideRoot()` realpath containment |
| `a22d5db` | Silent-failure + hygiene: bare `catch {}` hiding the whole code-analysis phase, `deleteWorkspaceAction` redirecting on failure, raw-exception leakage, client-graph tripwire re-export, credential blocklist gaps |
| `b6faa2b` | **DSA detectors** — writing the tests found a real bug: Map/Set required `new Map(`, so idiomatic `new Map<K,V>()` never matched. Fixed; all 18 detectors now asserted; `backupDatabase` covered |
| `5233c01` | Logged **REVIEW-015** |
| `d3b3173` | **Feature Trace step 1** — `buildFeatureTraces()` pure function + 4 tests |
| (0011) | **Step 2** — migration `0011_aberrant_valkyrie.sql`, additive column |
| `f9ef91d` | **Step 3** — generation wired into `persistAnalysis`, persisted to the new column |
| `650e58d` | **Step 4** — `getFeatureTracesByWorkspaceId` (Zod-validated on read), the `/workspaces/[id]/feature-trace` route, module card. Dogfooding exposed two real defects in the trace builder, both fixed: every page hop was labelled `dynamic()` (a Next config export taken as the symbol), and Server Actions never appeared because the walk sorted layers descending |

---

## 3. Active work: the Feature Trace plan

Full spec: `~/.claude/plans/github-link-analysis-not-floating-lollipop.md` (approved).

**Idea:** the app shows a *map* but never a *route*. A Feature Trace answers "a user clicks
this button — what actually happens?", walking entry point → … → data layer. It is the
connective layer joining Learning Map, DSA Bridge, Deep Review and Explain-Back, which today
are four parallel views that never reference each other. **Nothing existing is replaced.**

| Step | Status |
|---|---|
| 1 — `buildFeatureTraces` pure fn + tests | ✅ `d3b3173` |
| 2 — migration `0011` (`learning_maps.feature_traces_json`) | ✅ applied, verified additive |
| 3 — wire into `persistAnalysis` | ✅ `f9ef91d` (**hop `risks[]` still empty — see §4**) |
| 4 — route + workspace module card | ✅ `650e58d` |
| 5 — cross-links (hop concept → DSA Bridge, hop risk → Deep Review, trace → graph) + fill `risks[]` | ⬜ **next** |
| 6 — "Trace it yourself" (predict next hop) + calibration | ⬜ |

**Key APIs already in place:**
- `buildFeatureTraces(analysis: CodeAnalysis): FeatureTrace[]` in
  `lib/services/code-analyzer.service.ts` — entry points are files in layer `Routes & Pages` /
  `API Endpoints`; walks `importEdges` with a strictly increasing `WORKFLOW_ORDER` rank (that,
  plus a `seen` set, is what guarantees termination); ranks by PageRank of the terminal node;
  caps at 8 traces and 6 hops; a lone file is not a trace.
- Types `FeatureTrace` / `FeatureTraceHop` exported from the same file.
- Persisted to `learning_maps.feature_traces_json` via the new optional `featureTracesJson`
  field on `createLearningMapWithContent`.

**Step 4 still needs:** `getFeatureTracesByWorkspaceId()` on `learning-map.service.ts`
(returning `ServiceResult<FeatureTrace[]>`, Zod-parsed), the route, and the module card.

---

## 4. Known open items

**Deferred, with reasons (recorded in REVIEW-015):**
1. **Hop `risks[]` are empty.** The review's per-file severity map (`secByFile`) is scoped to
   the graph-badging block, which closes before traces are built. Needs a small hoist — marked
   `TODO(step 5)` in `persistAnalysis`.
2. **AST performance.** Measured **4–6 s for 123 files** against a documented "<2.5 s" budget:
   8 detectors + `computeFunctionMetrics` each do a full `walkAst` pass, and three re-walk per
   function (~3.9M node visits). Fix = merge into one visitor. Biggest user-visible win left.
3. **`scripts/pack-standalone.mjs` forbidden-content guard is untested** — the only thing
   stopping the live DB/`.env` reaching npm. It *was observed passing* ("no forbidden content",
   2023 files). Needs the script refactored to export its predicate.
4. **`session_logs` index.** ⚠️ **Hazard:** `schema.ts` declares *no* indexes but migration
   0004 created one in raw SQL, so `db:generate` could emit a `DROP INDEX`. Declare the
   existing index first. (0011 was inspected and was clean — additive only.)
5. **Dead FK** `explain_back_questions.learning_map_id` — written from a form field no
   component renders, never read. Dropping it rebuilds the table in SQLite; not worth it.
6. **`import "server-only"`** in `lib/db/client.ts` — right in principle, but the package isn't
   installed and adding it would break `tsx`/MCP resolution. The real tripwire (a re-export) is
   already removed.
7. **macOS untested** in CI (Windows + Linux only) — documented limitation.
8. **`mcp-server/license.ts`** Pro/Gumroad paywall logic is live in code but untested, while
   the roadmap says monetization is dormant. Worth a decision.

**Release readiness:** all blockers fixed. Remaining for v1.0.0: `npm login` + publish-2FA,
`git tag -a v1.0.0`, GitHub Release, `npm publish` — all maintainer-only outward actions.
Recommended: publish from a tag-triggered GitHub Actions workflow with `--provenance`.

---

## 5. Gotchas learned the hard way this session

- **A stray `C:\Users\Siddharth\package-lock.json` (88 bytes) still exists.** It made Next infer
  the home dir as workspace root, nesting the standalone build and killing `prepack`/`npx`, and
  it crashed the turbopack dev server. Worked around by pinning roots in `next.config.ts` — but
  the file is still there and may bite other tooling.
- **`npm run build` alone does not refresh `dist/`.** That needs `npm run pack:standalone`.
  Testing `dist/server.js` after only a build tests **stale code** (this wasted time here).
- **`MAX_FINDINGS = 16`** caps findings per analysis — one fixture can't assert all 18 DSA
  detectors; give each detector its own tiny project.
- **GateGuard** demands facts before the first Bash and before the first edit of each file. It
  fires on the *first* call in a message — so when batching parallel edits, one gets blocked and
  the rest apply. That produced a **duplicated test block** this session. Prefer one edit per
  message for new files/blocks, and re-grep after batched edits.
- **Verification gate order:** `lint → typecheck → build`, plus `npm test` when touching
  analyzer/import/workspace services. All four must pass.
- Stop the dev server before `npm run db:migrate` (it holds a write lock).

---

## 6. Commands

```bash
npm run dev            # next dev --turbopack --hostname 127.0.0.1
npm run lint
npm run typecheck
npm test               # tsx --test tests/import-pipeline.test.mts  (34 tests)
npm run build
npm run pack:standalone
npm run db:generate    # then INSPECT the SQL before db:migrate
npm run mcp
```

Browser QA that works (proven): `next start` against a temp `NCS_DATA_DIR`, then Playwright.
The standalone `dist/server.js` needs `pack:standalone` first.

---

## 7. Suggested opening prompt for the new chat

```
Read context.md, then implement step 5 of the plan at
~/.claude/plans/github-link-analysis-not-floating-lollipop.md — cross-links between
Feature Trace and the DSA Bridge / Deep Review / Learning Map, plus filling hop
risks[] (needs the secByFile hoist in persistAnalysis). Steps 1-4 are done and pushed.
```

**Two caveats carried out of step 4:**
- `MAX_TRACES = 8` truncates, and since every terminal is `schema.ts` the tie-break is
  alphabetical — so `workspaces/*` traces fall off the end. The plan's dogfood example
  ("Delete a workspace" showing the five-table cascade) is therefore not visible. Revisit the
  cap or the ranking.
- The page was verified by data (`buildFeatureTraces` output) and by build, **not** in a
  browser. Traces only exist for workspaces analysed after `f9ef91d`, so seeing it render
  needs a fresh import.
