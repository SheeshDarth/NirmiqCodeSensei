# Runtime Flow Map — NirmiqCodeSensei

This document describes execution paths observed in the current code. It complements [GRAPHIFY_MAP.md](GRAPHIFY_MAP.md): Graphify is the file/module index; this file follows calls across the boundaries where bugs commonly occur. Update the relevant path when code changes. Do not describe planned behavior as if it already runs.

## Runtime shape

```mermaid
flowchart TD
  Browser[Browser request] --> Next[Next.js App Router]
  Next --> Root[app/layout.tsx: fonts, CSS, metadata]
  Root --> Route[app/(app)/.../page.tsx]
  Route --> PageServices[lib/services/*: server-side reads]
  PageServices --> Drizzle[Drizzle db client]
  Drizzle --> SQLite[(data/nirmiqcodesensei.db)]
  Route --> Components[components/*: rendered UI]
  Components --> Form[Client form / Server Action]
  Form --> Action[app/(app)/**/actions.ts]
  Action --> Parse[FormData helpers + Zod validation]
  Parse --> Domain[lib/services/*: domain operation]
  Domain --> Drizzle
  Action --> Cache[revalidatePath / redirect / action state]
  Cache --> Route
```

## Startup and database initialization

1. `npm run dev` resolves to `next dev --webpack --hostname 127.0.0.1`; `npm run start` starts the production server on the same loopback host. Keep one bundler selected for a given `.next/dev` cache. If comparing bundlers, stop the server and rename `.next/dev` to a backup first; do not delete it.
2. `app/layout.tsx` supplies document metadata, Geist fonts, and global CSS. Routes under `app/(app)/` are wrapped by `app/(app)/layout.tsx`, which renders `components/layout/AppShell.tsx` around the page.
3. In the Node.js runtime, Next.js calls `register()` in `instrumentation.ts`; it imports and runs `runMigrations()` from `lib/db/migrate.ts`.
4. `lib/db/client.ts` chooses the database directory from `NCS_DATA_DIR`, then the legacy `NIRMIQ_DATA_DIR`, then `<cwd>/data`. It creates the directory, adopts a legacy database filename if needed, configures SQLite pragmas, checks integrity, and exports the Drizzle client. `lib/db/schema.ts` defines the tables and relationships.
5. Route pages and services access data through the server-side Drizzle client. Persistent learning data is in SQLite; client components hold only interaction state.
6. `npm run typecheck` uses `tsconfig.json` to include app-owned source and excludes `data/`; imported repositories under `data/imported-projects/` are user content and are checked by their own project toolchain.

## Workspace list and create path

### Read: render the workspace list

```text
GET /workspaces
  → app/(app)/workspaces/page.tsx
  → listWorkspaces() in lib/services/workspace.service.ts
  → Drizzle select from workspaces
  → components/workspace/WorkspaceCard.tsx for each row
  → HTML/RSC response
```

`listWorkspaces()` returns `ServiceResult<Workspace[]>`. The page renders an empty state on service failure or when there are no rows; a successful result is mapped into cards.

### Write: create a workspace

```text
CreateWorkspaceForm (client component, useActionState)
  → createWorkspaceAction() in app/(app)/workspaces/actions.ts
  → getString() extracts allowed FormData fields
  → createWorkspaceSchema.safeParse() in lib/validators/workspace.schema.ts
  → createWorkspace() in lib/services/workspace.service.ts
  → Drizzle insert into workspaces
  → revalidatePath('/workspaces')
  → redirect('/workspaces/{new-id}')
```

Validation and database failures return an error to the form instead of redirecting. The service converts database exceptions into the standard `{ ok: false, error, code }` shape.

## Learning map path

### Read: render a workspace map

`app/(app)/workspaces/[id]/learning-map/page.tsx` resolves the route params, then loads the workspace, learning map, concept links, explain-back questions, and search-index state. These service reads run together with `Promise.all`. If search is available and the query is long enough, the page also calls `searchWorkspace()`. It chooses the stored code architecture graph when valid and otherwise builds a fallback graph with `buildKnowledgeGraph()`. The resulting data is rendered with the learning-map components.

### Write: add map content

Forms in `components/learning-map/` submit to server actions in `app/(app)/workspaces/[id]/learning-map/actions.ts`. Each action extracts fields, validates with the corresponding schema in `lib/validators/learning-map.schema.ts`, calls a function in `lib/services/learning-map.service.ts`, then revalidates the workspace map and detail routes. Checkpoint completion also reaches `recomputeWorkspaceProgress()` so saved checkpoint state updates workspace progress.

## Explain-back answer path

### Read and render

`app/(app)/workspaces/[id]/explain-back/page.tsx` loads the workspace and questions concurrently through `getWorkspaceById()` and `getQuestionsByWorkspaceId()`, then renders each question with `components/explain-back/QuestionCard.tsx`.

### Submit an answer

```text
QuestionCard answer form
  → submitAnswerAction() in app/(app)/workspaces/[id]/explain-back/actions.ts
  → getString() + submitAnswerSchema.safeParse()
  → submitAnswer() in lib/services/explain-back.service.ts
  → Drizzle update of userAnswer / confidence / score
  → recomputeWorkspaceProgress() in workspace.service.ts
  → revalidate workspace explain-back and global /explain-back paths
  → render updated answer and progress
```

The progress calculation reads learning-map checkpoint completion (60% weight) and green-confidence answers (40% weight), then normalizes across whichever data exists. If neither source has data, progress is zero.

## Project import and analysis (high-level)

The import surface is `/workspaces/import`; its server actions are in `app/(app)/workspaces/import/actions.ts`. Project parsing and analysis live in `lib/services/project-analyzer.service.ts` and supporting analyzer services. The analysis path can create a workspace, populate a learning map, questions, concepts, architecture graph, review, and feature traces. The workspace stores its source path and analysis fingerprint; reanalysis is exposed by `reanalyzeWorkspaceAction()` in `app/(app)/workspaces/actions.ts`, which revalidates the workspace, learning-map, explain-back, and DSA-bridge pages after success. Consult the analyzer-specific file map in `GRAPHIFY_MAP.md` before editing this path.

## Implementation decision capture path — 2026-10-16

```text
MCP client calls ncs_record_decision
  → ListToolsRequestSchema advertises the tool in mcp-server/index.ts
  → runTool validates snake_case MCP input with Zod
  → createDecisionSchema validates the normalized domain input
  → createDecisionRecord() in lib/services/decision.service.ts
  → Drizzle INSERT into decision_records
  → local SQLite; workspace foreign key cascades on workspace deletion
```

Read path: `GET /workspaces/{id}/decisions` → `app/(app)/workspaces/[id]/decisions/page.tsx` → `getWorkspaceById()` and `getDecisionRecordsByWorkspaceId()` concurrently → SQLite rows parsed from JSON list fields → rendered decision cards. `GET /workspaces/{id}/decisions/export` calls `generateDecisionMarkdown()` and returns a Markdown attachment. The exporter records concise rationale and alternatives; it does not collect hidden model reasoning.

## Feature flow Markdown export path — 2026-10-16

```text
Feature Trace page download link
  → GET /workspaces/{id}/flow
  → app/(app)/workspaces/[id]/flow/route.ts
  → generateFlowMarkdown() in lib/services/export.service.ts
  → getWorkspaceById() + getFeatureTracesByWorkspaceId() concurrently
  → learning_maps.feature_traces_json validated by learning-map.service.ts
  → Markdown entry → ordered hops (layer, file, optional symbol/line, concepts, risks) → terminal
  → Content-Disposition attachment (flow-{workspace-slug}.md)
```

The export uses the latest saved analysis. It does not scan code at download time, so re-analysis is needed to refresh a trace after source changes. Empty/manual maps produce a clear no-traces note rather than an invented path.

## Change boundary for this session — 2026-10-16

Changed code paths: added the `decision_records` schema/migration; decision input validator and service; MCP `ncs_record_decision` tool; workspace decision list and `decision.md` export route; feature trace `flow.md` export route and exporter functions; workspace navigation links. The user quiz remains the `AGENTS.md` end-of-substantial-session workflow gate and is not a new app quiz subsystem.

## Development server stabilization — 2026-10-28

```text
npm run dev
  → package.json dev script selects next dev --webpack
  → next CLI binds to 127.0.0.1 and uses .next/dev
  → Node runtime loads instrumentation.ts
  → register() imports runMigrations() and opens the configured SQLite database
  → App Router compiles and serves requested routes
```

Diagnosis evidence: Webpack served `/workspaces`, `/workspaces/new`, `/settings`, and `/dashboard`. Starting Turbopack against the same existing `.next/dev` then reproduced `MODULE_UNPARSABLE` for `instrumentation.ts` even though the source file existed. Moving the generated cache aside without deleting it allowed Turbopack to serve all four routes; the page remained available after 30 seconds idle. This supports a stale/mixed bundler-cache cause. The default script now pins Webpack so ordinary starts do not switch bundlers against the shared dev cache. The old cache copies remain under `.next/dev-preserved-before-turbo-20261028` and `.next/dev-preserved-turbo-20261028` for inspection.

Verification boundary: the default Webpack server is checked again after the script change. Turbopack startup and route serving were reproduced from a clean cache; the legacy errors “Failed to write app endpoint” and “Next.js package not found” were not reproduced in these runs.

The first typecheck after importing a repository also exposed that TypeScript's recursive `**/*.ts` include was compiling that external project. `tsconfig.json` now excludes `data/`, matching the existing lint and Git ignore boundaries; imported source files and dependencies are left unchanged.


## Guided Learning Map — 2026-10-28

```text
Import/refresh → compute analysis and optional narrative → analyzeCode corpus/imports
  → buildSnapshot → bounded in-memory TypeScript call resolver
  → file hashes + typed edges + paths + coverage/stop metadata
  → transaction: generated questions/concepts/search/map swap, prior learning retained
Learning Map page → getPathwaySnapshot → normalize legacy/v2 → freshness
  → LearningMapExperience → entry/step/branch URL state → numbered walkthrough
  → optional Explore map → projectPathGraph → selected/active node rendering
Source request → same-origin check → snapshot analysis/target lookup
  → confined descriptor read → bounded excerpt/hash/freshness → escaped code view
Review/assessment POST → same-origin/validation → canonical selected path
  → source hash verification → workspace-owned review / immutable rubric attempt
Study POST → workspace ownership → explicit catalog proposals / learner edits
  → cycle check in transaction → accepted prerequisite levels
Explain-Back and flow export → same saved pathway records/snapshot contracts
```

Generated imports and calls are static evidence, not observed runtime execution. Selected graph files are projected from the saved manifest when overview caps omitted them. The source viewer reads current files without executing them. Assessment history retains its original path/rubric references; it is never silently carried to changed content. The old Feature Trace URL redirects to Learning Map.

Change boundary: snapshot/shared/static-call modules; pathway/source/learning/study services; source and pathway routes; canonical UI/history components; graph highlighting; regenerated-analysis transaction; four learner tables and additive migration; exports/navigation/specifications/tests. The approved master plan and outstanding human evaluation live in LEARNING_MAP_MASTER_PLAN.md.


### Verification of the guided path implementation

2026-10-28: lint/typecheck/build and 47 tests pass. Packaged dist/server.js was exercised over HTTP using an isolated temporary database and fixture source. GET Learning Map returned 200; Feature Trace returned a relative 307 redirect; source preview and learner writes succeeded; cross-site/stale-target requests and cyclic prerequisites were rejected; changed source blocked readiness while preserving attempts. MCP bundle handshake found 13 tools and read the same temporary workspace. Main database still contains its original one workspace; tests did not import fixtures into it. Packaging found no forbidden user data.

Next's generated dev route validator still referenced the removed Feature Trace page, so its generated types directory was preserved under .next/dev/types-preserved-route-* and current production types regenerated. The remaining build messages are dynamic filesystem/NFT tracing warnings; the packaged privacy guard passed. Browser interactions could not be verified because the configured Chrome binary is absent and automated policy blocked a headless Edge debugging launch. Beginner evaluation and rubric calibration remain pending.
