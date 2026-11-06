# Implementation Decision Log — NirmiqCodeSensei

This is the living log for consequential choices made while changing this codebase. It explains why a change took its shape, what realistic alternatives were considered, what trade-off was accepted, and which code paths are affected.

Use this log alongside:

- [COUNCIL_REVIEW_LOG.md](COUNCIL_REVIEW_LOG.md) for architecture, security, and product-level council decisions.
- [GRAPHIFY_MAP.md](GRAPHIFY_MAP.md) for the code and module inventory.
- [flow.md](flow.md) for runtime call paths and the exact path changed in a session.

## What counts as a meaningful decision

Log a decision when it changes or settles a choice about architecture, dependencies, data ownership or flow, behavior, security, persistence, module boundaries, or a non-obvious implementation approach. Record alternatives that were genuinely viable, not every imaginable option. Routine naming, formatting, and straightforward edits do not need entries.

Write down evidence separately from inference. If an alternative was not evaluated, say so; do not invent a debate after implementation. If later evidence changes the answer, add a superseding entry and link the earlier one instead of silently rewriting history.

## Entry template

```md
### DEC-NNN — Short decision title

**Date:** YYYY-MM-DD
**Change/session:** short identifier or user request
**Affected path:** files and important functions
**Question:** what needed a decision?
**Options considered:**
- Option A — benefit and cost
- Option B — benefit and cost
**Decision:** what was chosen
**Reasoning:** evidence and constraints that favor it
**Accepted trade-off:** what gets worse or remains limited
**Verification:** relevant checks or manual evidence
**Status:** active | superseded by DEC-NNN
```

## Decisions

### DEC-001 — Keep decision rationale, runtime flow, and learning checks complementary

**Date:** 2026-10-15  
**Change/session:** Add durable change-learning documentation  
**Affected path:** `AGENTS.md`, `docs/decision.md`, `docs/flow.md`, `docs/GRAPHIFY_MAP.md`, `docs/COUNCIL_REVIEW_LOG.md`

**Question:** How should AI-assisted code changes preserve their rationale, show the real execution path, and check that the student understood substantial changes without duplicating existing project docs or blocking trivial work?

**Options considered:**

- Put every decision and every call edge into `COUNCIL_REVIEW_LOG.md` and `GRAPHIFY_MAP.md`. This avoids new files, but mixes implementation notes with architecture reviews and makes the code map noisy.
- Add standalone living decision and flow docs with clear boundaries to the existing council log and Graphify map. This adds two files, but gives change-level rationale and runtime traces a dedicated home.
- Build a product-level quiz system with database state and automatic scoring now. That would be enforceable in the app, but adds UI, schema, and scoring scope before the lightweight learning workflow has been validated.

**Decision:** Add `docs/decision.md` for material implementation choices and `docs/flow.md` for real execution paths. Continue using the council log for higher-level rulings and the Graphify map for stable code relationships. Add an agent workflow rule that quizzes the user after a substantial code session; do not add an app quiz feature in this documentation change.

**Reasoning:** NirmiqCodeSensei explicitly aims to help students explain project internals and learn from AI-assisted work. Its existing council log and Graphify map already cover related but different levels, so dedicated change-level records fill a gap without replacing them. An assistant-run quiz is the smallest way to test the learning idea before building persistent product behavior.

**Accepted trade-off:** Markdown can become stale and an assistant instruction cannot technically prevent a user from moving on without passing. To reduce drift, update the flow alongside affected code, scope it to actual changed paths, and define a substantial session and pass threshold in `AGENTS.md`. Product-level enforcement would require a later feature with stored quiz state.

**Vibecode applicability:** The concepts can transfer, but should be adapted. Project Manager can surface links to these artifacts in `.claude/project-knowledge.md`; its current setup does not create root workflow docs or quiz contributors. Orchestrator can route to a relevant decision or codebase-mapping skill and its workflow can expose handoffs and verification, but a mandatory learner quiz is not a natural default for a skill router. Keep that gate optional there unless the audience is explicitly educational.

**Verification:** Compared the proposal with the project PRD, TRD, current workspace/action/service code, Graphify map, Council Review Log, and the public GitHub repositories `SheeshDarth/vibecode-project-manager` and `SheeshDarth/vibecode-orchestrator`.

**Status:** active

### DEC-002 — Persist concise implementation decisions and export analyzed flow traces

**Date:** 2026-10-16  
**Change/session:** Add workspace decision capture and Markdown artifacts  
**Affected path:** `lib/db/schema.ts`, migration `0012_complete_marauders.sql`, `lib/services/decision.service.ts`, `lib/validators/decision.schema.ts`, `mcp-server/index.ts`, workspace decision and feature-trace routes, `lib/services/export.service.ts`

**Question:** How can coding assistants record consequential implementation choices in a form students can review, and how can users export a trustworthy cross-file execution map?

**Options considered:**
- Keep decisions only in `docs/decision.md`. This is easy to read in Git, but coding assistants must edit arbitrary files and the product cannot list/export per-workspace rationale consistently.
- Persist structured, concise decision records in the existing local SQLite database, expose one MCP write tool and render/export records by workspace. This adds a schema/service/UI path, but reuses the product's local-first storage and assistant integration.
- Rebuild a separate runtime call graph for flow export. That could present richer details, but duplicates the analyzer's saved `FeatureTrace` path and risks the two traces disagreeing.

**Decision:** Store user-facing decision summaries (chosen option, viable alternatives, rationale, accepted trade-off, affected paths) in `decision_records`. Capture them through `ncs_record_decision`, display them on the workspace decision page, and export them as Markdown. Generate flow Markdown from the existing saved `FeatureTrace[]` and clearly label that it represents the latest saved analysis.

**Reasoning:** Nirmiq already has a local database and MCP tools, so structured capture fits current ownership boundaries. Existing feature traces are derived from the real analyzer import graph and are the current source of truth for flow visualization; using them avoids a second, diverging graph implementation. The rationale field is explicitly concise and user-facing; private chain-of-thought is not collected.

**Accepted trade-off:** Decision records are workspace-scoped and require the assistant to call the MCP tool; they do not automatically synchronize with a repository's root `docs/decision.md`. The exported flow can become stale when code changes until the workspace is analyzed again. A separate persisted quiz product is still deferred; the five-question learning gate remains in `AGENTS.md` and uses existing Explain-Back concepts without duplicating product state.

**Verification:** Migration generated by Drizzle. `npm run lint`, `npm run typecheck`, and `npm run build` passed. Build emitted the existing Turbopack file-tracing warning through `next.config.ts` imports in the analyzer and backup services.

**Status:** active

### DEC-003 — Pin the Windows development script to Webpack

**Date:** 2026-10-28  
**Change/session:** Diagnose intermittent Next.js development failures  
**Affected path:** `package.json` (`dev` script), `instrumentation.ts`, generated `.next/dev` cache; `docs/flow.md`, `docs/DEBUGGING.md`

**Question:** Should this project keep using Turbopack by default, or select a single development bundler after observing instrumentation and endpoint failures on Windows?

**Options considered:**
- Keep the Turbopack default and leave the cache behavior undocumented. It avoids changing developer commands, but a switch to Webpack can reuse the same `.next/dev` output and reproduce a missing-instrumentation-module error.
- Pin `npm run dev` to Webpack, which started and served the target routes. This makes the normal path explicit and avoids switching bundlers against one cache; it gives up Turbopack's faster cold start in this environment.
- Upgrade Next.js or change `next.config.ts`. There was no evidence yet that the installed version or root configuration caused the reproduced failure: local resolution is 16.2.7, the workspace root is explicitly pinned, and Turbopack worked after a fresh cache.

**Decision:** Change only the `dev` script to `next dev --webpack --hostname 127.0.0.1`. If comparing bundlers later, stop the server and preserve the old `.next/dev` cache by renaming it before starting the other bundler.

**Reasoning:** With the same installed dependencies and source tree, Webpack served four routes. Switching from Webpack to Turbopack over the same `.next/dev` cache reproduced the reported `MODULE_UNPARSABLE` error for `instrumentation.ts`, despite the source existing. Preserving that cache and restarting Turbopack from a fresh one made the same routes serve successfully. This isolates the reproduced error to generated dev-cache state associated with switching bundlers. The app stayed on `/workspaces` after a 30-second idle interval without additional server requests.

**Accepted trade-off:** Webpack cold compilation may be slower than Turbopack. The handoff's other reported errors, including “Failed to write app endpoint” and “Next.js package not found”, were not reproduced, so their cause remains unconfirmed. Existing caches are kept as backups instead of deleted.

**Verification:** Webpack and fresh-cache Turbopack each returned HTTP 200 for `/workspaces`, `/workspaces/new`, `/settings`, and `/dashboard`; the workspace page showed the pre-existing workspace record. After editing the script, the exact `npm run dev` command started at `127.0.0.1:3000`, served `/workspaces`, `/workspaces/new`, and `/settings`, and the workspace page stayed unchanged during a 30-second idle check.

**Status:** active

### DEC-004 — Exclude imported project data from the app TypeScript program

**Date:** 2026-10-28  
**Change/session:** Diagnose typecheck errors after importing a repository  
**Affected path:** `tsconfig.json`, `data/imported-projects/`

**Question:** Should `tsc --noEmit` compile TypeScript files from repositories that CodeSensei stores as user data?

**Options considered:**
- Keep the default recursive include and install/fix dependencies in every imported project. This would mix those projects' own dependency/configuration requirements into CodeSensei's typecheck and could modify user content.
- Exclude `data/` from the CodeSensei TypeScript program. This leaves stored repositories intact and limits typechecking to app-owned source, but means imported project code is checked only by its own toolchain.

**Decision:** Add `data` to `tsconfig.json`'s `exclude` list. Keep lint's existing `data/` exclusion aligned with this boundary.

**Reasoning:** The failing files were under `data/imported-projects/smart-electricity-billing-system/` and reported missing dependencies and aliases such as `@playwright/test`, Vite, React Query, and project-local `@/` paths. `.gitignore` already treats `data/imported-projects/` as local imported content; it is not CodeSensei source and should not block the host application's typecheck.

**Accepted trade-off:** This check will not typecheck imported project code. Users should run that project's own checks when they intentionally work on it.

**Verification:** `npm run typecheck`, `npm test` (35/35), and `npm run build` pass after the exclusion; imported content remains untouched.

**Status:** active


### DEC-005 — Guided walkthroughs with explicit evidence

**Date:** 2026-10-28
**Choice:** Make a readable stepper the default and retain the force graph as an optional synchronized view. Reuse the current renderer rather than adding another graph package; the missing capability was readable order, evidence and source inspection. Versioned snapshot JSON normalizes old arrays. Hashes separate stable file/symbol identities from content validity. An inferred file export is labelled as such; supported static call targets use the TypeScript compiler already in the project.
**Alternatives:** Only strengthen graph arrows (insufficient reading guidance); replace the renderer (dependency and migration cost without better evidence); promise runtime flow from imports (unsupported); require complete runtime instrumentation before shipping (delays useful local learning).
**Trade-off:** Compiler analysis is bounded to 100 JS/TS files and local configuration. Dynamic calls, external config inheritance and unsupported languages remain unresolved. Import suggestions are capped and labelled; static branches are bounded. TypeScript moved to runtime dependencies and is externalized for Next standalone.

### DEC-006 — Confined live source, durable learner history and editable curriculum

**Date:** 2026-10-28
**Choice:** Source requests identify saved targets server-side, with descriptor/containment/link/size/UTF-8 checks and content hashes. Store reviewed steps, immutable rubric attempts and study nodes/edges under workspace foreign keys, independent of generated map IDs. Prepare analysis before one transactional replacement and retain unmatched prior learning material.
**Alternatives:** Accept a browser-submitted path (unnecessary filesystem exposure); store raw source in SQLite (duplicates private code and becomes stale); tie progress to regenerated map rows (loses work); overwrite the last answer (loses assessment history); infer prerequisites from imports (confuses code structure with education).
**Trade-off:** Source reads validate bounded files again; missing/changed source prevents readiness but does not erase explanations. Rubric thresholds are local self-assessment and require human calibration. Suggestions come from a small explicit concept catalog and require acceptance; user edits and rejected edges survive refresh. No new persistent learning data is stored in browser state.


**DEC-005 implementation bounds:** The TypeScript host reserves entry files and parses reachable imports within 100 files. Each static relationship category and the sampled import input have a 5,000-edge budget; static entry recommendations are capped at 128 with visible partial-coverage warnings. These additional bounds prevent pathological source from generating unbounded UI payloads. Duplicate lexical symbol identities are left unresolved. Node tests cover the parser/step caps and ambiguous names.


**DEC-006 packaged-server correction:** Next standalone can reconstruct request.url with localhost while the browser addresses 127.0.0.1. Same-origin checks therefore compare Origin to the browser-facing Host, require an explicit loopback hostname, reject cross-site Fetch Metadata, and ignore forwarded-host headers. Comparing only request.url incorrectly rejected legitimate writes in the packaged HTTP test. The legacy redirect uses a relative Location to retain the current origin. Regression assertions cover reconstructed URLs and hostile Host/Origin values.
