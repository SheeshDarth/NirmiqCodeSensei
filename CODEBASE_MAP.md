# NirmiqLearn OS — Codebase Map

Generated: 2026-06-21 · Branch: `feature/structural-cleanup`

---

## 1. Active Entry Points & Routes

### Root
| File | Route | Type | Notes |
|---|---|---|---|
| `app/page.tsx` | `/` | Server Component | Landing page → "Open Dashboard" link |
| `app/layout.tsx` | (root) | Layout | Geist fonts, global CSS, `<html>` shell |
| `app/(app)/layout.tsx` | `/dashboard`, `/workspaces`, etc. | Layout | Wraps all app pages in `AppShell` |

### Dashboard
| File | Route | Notes |
|---|---|---|
| `app/(app)/dashboard/page.tsx` | `/dashboard` | `force-dynamic`; reads workspaces, questions, debug logs, concept links in parallel. Shows stats + recent workspaces + weak-area callout. |

### Workspaces
| File | Route | Type | Notes |
|---|---|---|---|
| `app/(app)/workspaces/page.tsx` | `/workspaces` | Server | Workspace grid. Calls `listWorkspaces()`. |
| `app/(app)/workspaces/new/page.tsx` | `/workspaces/new` | Server | Renders `CreateWorkspaceForm`. |
| `app/(app)/workspaces/actions.ts` | — | Server Action | `createWorkspaceAction` → validates → `createWorkspace()` → redirect. |
| `app/(app)/workspaces/import/page.tsx` | `/workspaces/import` | **Client** | `useActionState(importProjectAction)`. Live GitHub/local-path detection. |
| `app/(app)/workspaces/import/actions.ts` | — | Server Action | `importProjectAction` → resolves path → clones if GitHub → `analyzeProject()` → returns result. |
| `app/(app)/workspaces/[id]/page.tsx` | `/workspaces/:id` | Server | Workspace hub: header, progress bar, 6 feature nav cards. |

### Workspace Feature Pages
| File | Route | Notes |
|---|---|---|
| `app/(app)/workspaces/[id]/learning-map/page.tsx` | `/workspaces/:id/learning-map` | Server. Loads workspace + map + concept links. Prefers `map.graphJson` (real architecture graph) over `buildKnowledgeGraph()` fallback. Renders `KnowledgeGraphLoader`. |
| `app/(app)/workspaces/[id]/learning-map/actions.ts` | — | `createMapAction`, `addModuleAction`, `addCheckpointAction`, `toggleCheckpointAction`, `updateModuleConfidenceAction`, `deleteModuleAction` |
| `app/(app)/workspaces/[id]/explain-back/page.tsx` | `/workspaces/:id/explain-back` | Server. Questions list + stats. |
| `app/(app)/workspaces/[id]/explain-back/actions.ts` | — | `addQuestionAction`, `submitAnswerAction`, `deleteQuestionAction` |
| `app/(app)/workspaces/[id]/debug-lab/page.tsx` | `/workspaces/:id/debug-lab` | Server. Shows risk map from analysis. |
| `app/(app)/workspaces/[id]/debug-lab/actions.ts` | — | `createDebugLogAction`, `updateDebugLogAction`, `deleteDebugLogAction` |
| `app/(app)/workspaces/[id]/daily-log/page.tsx` | `/workspaces/:id/daily-log` | Server. Form + chronological entries. |
| `app/(app)/workspaces/[id]/daily-log/actions.ts` | — | `createDailyLogAction`, `deleteDailyLogAction` |
| `app/(app)/workspaces/[id]/dsa-bridge/page.tsx` | `/workspaces/:id/dsa-bridge` | Server. Grouped by concept type + practice queue. |
| `app/(app)/workspaces/[id]/dsa-bridge/actions.ts` | — | `createConceptLinkAction`, `deleteConceptLinkAction` |
| `app/(app)/workspaces/[id]/session-log/page.tsx` | `/workspaces/:id/session-log` | Server. Read-only — populated via MCP hooks, not UI actions. |
| `app/(app)/workspaces/[id]/export/route.ts` | `/workspaces/:id/export` | API Route (GET). Returns Markdown download via `generateWorkspaceMarkdown()`. |

### Global Aggregate Views (Sidebar links)
| File | Route | Notes |
|---|---|---|
| `app/(app)/learning-map/page.tsx` | `/learning-map` | Lists all maps across workspaces. Links to each workspace's map. |
| `app/(app)/explain-back/page.tsx` | `/explain-back` | All questions, grouped. Read-only aggregate. |
| `app/(app)/dsa-bridge/page.tsx` | `/dsa-bridge` | All concept links, grouped by type. |
| `app/(app)/debug-lab/page.tsx` | `/debug-lab` | All debug logs with resolved/open filter. |
| `app/(app)/daily-log/page.tsx` | `/daily-log` | All daily logs across workspaces. |
| `app/(app)/settings/page.tsx` | `/settings` | Static info: storage, MCP setup, Pro features, privacy. |
| `app/(app)/privacy/page.tsx` | `/privacy` | Static privacy policy. |

---

## 2. Components

### Layout (`components/layout/`)
| File | Type | Role |
|---|---|---|
| `AppShell.tsx` | **Client** | Holds sidebar-collapsed state. Composes `Sidebar` + `Topbar` + `<main>`. |
| `Sidebar.tsx` | **Client** | Nav links, brand mark, collapse toggle. `suppressHydrationWarning` on the toggle button. |
| `Topbar.tsx` | **Client** | Workspace indicator, search input, Export button (disabled). `suppressHydrationWarning` on input + button. |

### Workspace (`components/workspace/`)
| File | Type | Role |
|---|---|---|
| `CreateWorkspaceForm.tsx` | Client | `useActionState(createWorkspaceAction)`. Title, type, goal, description. |
| `WorkspaceCard.tsx` | Client | Card with status dot, progress bar, type badge. Used in `/workspaces`. |

### Learning Map (`components/learning-map/`)
| File | Type | Role |
|---|---|---|
| `KnowledgeGraph.tsx` | **Client** | Full 2D/3D force-graph. Loaded only via `KnowledgeGraphLoader` — never imported directly. `colorOf()`, link styles (flow/imports/contains), click-to-inspect panel, dynamic legend. |
| `KnowledgeGraphLoader.tsx` | Client | `next/dynamic(() => import("./KnowledgeGraph"), { ssr: false })` wrapper. **Critical: prevents Turbopack worker crash** from `force-graph`/`three` in server-reachable module. |
| `CreateMapForm.tsx` | Client | Manual map creation form (shown when no map exists yet). |
| `AddModuleForm.tsx` | Client | Add a manual module to an existing map. |
| `AddCheckpointForm.tsx` | Client | Add a manual understanding checkpoint. |
| `ModuleCard.tsx` | Client | Shows module difficulty, confidence selector, delete action. Calls `deleteModuleAction` and `updateModuleConfidenceAction`. |

### Explain-Back (`components/explain-back/`)
| File | Type | Role |
|---|---|---|
| `QuestionCard.tsx` | Client | Expand/collapse, answer textarea, confidence selector (red/yellow/green), delete. |
| `AddQuestionForm.tsx` | Client | Add a manual question with difficulty and expected key points. |

### Debug Lab (`components/debug-lab/`)
| File | Type | Role |
|---|---|---|
| `CreateDebugLogForm.tsx` | Client | Title + error message fields. Bound to `createDebugLogAction`. |
| `DebugLogCard.tsx` | Client | Expand to fill cause/fix/lesson/rule. Calls `updateDebugLogAction`. Delete button. |

### DSA Bridge (`components/dsa-bridge/`)
| File | Type | Role |
|---|---|---|
| `AddConceptLinkForm.tsx` | Client | feature → conceptName → conceptType → explanation → practiceTask. |
| `ConceptLinkCard.tsx` | Client | Expand shows `codeSnippet` in `<pre>` with `sourceFile` label. Delete button. |

### Daily Log (`components/daily-log/`)
| File | Type | Role |
|---|---|---|
| `CreateDailyLogForm.tsx` | Client | Date + 5 text fields (built, understood, unclear, bugs, next). |
| `DailyLogEntry.tsx` | Client | Read-only display + delete. |

---

## 3. Service Layer (`lib/services/`)

All service functions return `ServiceResult<T>` and wrap all DB calls in `try/catch`.

### Active — called from pages/actions/MCP
| Service | Key Exports Used |
|---|---|
| `workspace.service.ts` | `createWorkspace`, `getWorkspaceById`, `listWorkspaces` |
| `learning-map.service.ts` | `createLearningMap`, `createLearningMapWithContent`, `getAllLearningMaps`, `getLearningMapByWorkspaceId`, `addModule`, `updateModuleConfidence`, `deleteModule`, `addCheckpoint`, `toggleCheckpoint` |
| `explain-back.service.ts` | `createQuestion`, `getQuestionsByWorkspaceId`, `getWeakQuestions`, `getAllQuestions`, `submitAnswer`, `deleteQuestion` |
| `debug-log.service.ts` | `createDebugLog`, `getDebugLogsByWorkspaceId`, `getAllDebugLogs`, `updateDebugLog`, `deleteDebugLog` |
| `daily-log.service.ts` | `createDailyLog`, `getDailyLogsByWorkspaceId`, `getAllDailyLogs`, `deleteDailyLog` |
| `concept-link.service.ts` | `createConceptLink`, `createConceptLinkWithSource`, `getConceptLinksByWorkspaceId`, `getAllConceptLinks`, `deleteConceptLink` |
| `session-log.service.ts` | `createSessionLog` (MCP hook), `getSessionLogsByWorkspaceId` (page) |
| `export.service.ts` | `generateWorkspaceMarkdown` (export route) |
| `knowledge-graph.service.ts` | `buildKnowledgeGraph` (fallback for old workspaces; new workspaces use stored `graphJson`) |
| `project-analyzer.service.ts` | `resolveProjectPath`, `cloneOrPullRepo`, `analyzeProject` (import pipeline) |
| `local-analyzer.service.ts` | `detectStack`, `generateLocalAnalysisText` (called by `analyzeProject` when no API key) |
| `code-analyzer.service.ts` | `analyzeCode` (called by `analyzeProject`; walks files, detects DSA signals, builds arch graph) |

### Orphaned — defined but never called from any page, action, or MCP tool
| Function | File | Status |
|---|---|---|
| `archiveWorkspace` | `workspace.service.ts:88` | No UI or action triggers this |
| `updateWorkspace` | `workspace.service.ts:70` | Only used internally by `archiveWorkspace` (also dead) |
| `calculateWorkspaceProgress` | `workspace.service.ts:94` | Reads `progressScore` but nothing ever _writes_ a non-zero progress score to the DB |
| `getRecentSessionLogs` | `session-log.service.ts:57` | Unused export |
| `getDebugLogById` | `debug-log.service.ts:47` | Unused export |

---

## 4. Database

**Engine:** SQLite via `better-sqlite3` + Drizzle ORM  
**File:** `data/nirmiqlearn.db`  
**Schema:** `lib/db/schema.ts` · **Client:** `lib/db/client.ts` · **Migrations:** `lib/db/migrations/`  
**Auto-run:** `instrumentation.ts` calls `runMigrations()` on `nodejs` runtime startup.

### Tables
| Table | Key Columns | Notes |
|---|---|---|
| `workspaces` | id, title, description, type, goal, status, progressScore, createdAt | `progressScore` defaults to 0 and is never updated by the app |
| `learning_maps` | id, workspaceId, title, summary, modulesJson, conceptsJson, checkpointsJson, analysisRaw, graphJson, createdAt | `conceptsJson` column is never written to (always `"[]"`) — dead column |
| `explain_back_questions` | id, workspaceId, learningMapId, question, difficulty, expectedPointsJson, userAnswer, score, confidence | |
| `debug_logs` | id, workspaceId, title, errorMessage, suspectedCause, actualCause, fixSummary, lessonLearned, preventionRule | |
| `daily_logs` | id, workspaceId, date, builtToday, understoodToday, unclearTopics, bugsFaced, nextAction | |
| `session_logs` | id, workspaceId, toolName, actionSummary, explanation, riskLevel, outcome, source | Populated by MCP hook (`nirmiq_explain_command`) |
| `concept_links` | id, workspaceId, projectFeature, conceptName, conceptType, explanation, practiceTask, sourceFile, codeSnippet | `sourceFile`/`codeSnippet` set by import pipeline; null for manually added links |

### Migrations (in order)
| # | Tag | Added |
|---|---|---|
| 0 | `0000_colorful_firebird` | Base schema (workspaces, learningMaps, questions, debugLogs, dailyLogs, conceptLinks) |
| 1 | `0001_mature_jazinda` | `session_logs` table |
| 2 | `0002_add_analysis_raw` | `analysis_raw` on `learning_maps` |
| 3 | `0003_massive_mastermind` | `graph_json` on `learning_maps`; `source_file` + `code_snippet` on `concept_links` |

---

## 5. MCP Server (`mcp-server/`)

**Transport:** stdio only (no network socket)  
**Run:** `npm run mcp` → `tsx mcp-server/index.ts`

| Tool | Tier | Description |
|---|---|---|
| `list_workspaces` | Free | All workspaces |
| `get_workspace_summary` | Free | Full map + questions + concept links for one workspace |
| `add_debug_log` | Free | Creates a `debug_logs` row |
| `add_question` | Free | Creates an `explain_back_questions` row |
| `add_concept_link` | Free | Creates a `concept_links` row |
| `add_daily_log` | Free | Creates a `daily_logs` row |
| `get_weak_questions` | Free | Questions with `confidence = "red"` |
| `nirmiq_explain_command` | Free | Logs AI explanation of a tool call to `session_logs` |
| `nirmiq_generate_questions` | **Pro** | Calls Claude → 5 explain-back questions from code snippet |
| `nirmiq_suggest_concepts` | **Pro** | Calls Claude → 3-5 DSA concepts from code snippet |
| `nirmiq_debug_assist` | **Pro** | Calls Claude → root cause + fix + prevention rule |
| `nirmiq_analyze_project` | **Pro** | Full project analysis via Claude API |

**License gate:** `mcp-server/license.ts` — reads `NIRMIQ_PRO_KEY` env var, verifies against Gumroad API, caches SHA-256(key) for 7 days in `data/license-cache.json`.

---

## 6. Validators (`lib/validators/`)

| File | Schema | Used By |
|---|---|---|
| `workspace.schema.ts` | `createWorkspaceSchema`, `updateWorkspaceSchema` | `createWorkspaceAction` (create); `updateWorkspaceSchema` unused in UI |
| `learning-map.schema.ts` | `createLearningMapSchema`, `addModuleSchema` | Learning map actions |
| `explain-back.schema.ts` | `addQuestionSchema`, `submitAnswerSchema` | Explain-back actions |
| `debug-log.schema.ts` | `createDebugLogSchema`, `updateDebugLogSchema` | Debug lab actions |
| `daily-log.schema.ts` | `createDailyLogSchema` | Daily log actions |
| `concept-link.schema.ts` | `createConceptLinkSchema` | DSA bridge actions |

---

## 7. Shared Utilities

| File | Exports | Notes |
|---|---|---|
| `lib/utils.ts` | `parseExpectedPoints`, `formatDate`, `clamp` | Client-safe; no Node imports |
| `lib/utils/server.ts` | `getString(fd, key)`, `getUUID(fd, key)` | Server-only FormData helpers. All actions must use these — never `formData.get()` directly. |
| `lib/types.ts` | `ServiceResult<T>` | `{ ok: true, data } \| { ok: false, error, code? }` |
| `lib/db/client.ts` | `db` | Single Drizzle instance (import as `@/lib/db/client`, not `@/lib/db`) |
| `lib/db/migrate.ts` | `runMigrations()` | Called by `instrumentation.ts` on startup |

---

## 8. Dead / Orphaned Files

### Scripts (one-off tooling, not app code)
| File | Purpose |
|---|---|
| `scripts/build-pitch-deck.mjs` | Generates a PPTX pitch deck. Not part of the app. |
| `scripts/extract-pptx.py` | Extracts PPTX content. Not part of the app. |

### Launch Copy (not app code)
`launch/` — marketing text files (bootcamp emails, HackerNews post, Reddit posts, Twitter thread). Pure text, no code.

### Bin
`bin/nirmiq.mjs` — CLI launcher for the app. Not imported by Next.js.

### Hooks (supporting tooling, not app code)
`hooks/install-hooks.mjs` — Installs the vibe coding companion hook into a user's project.  
`hooks/pre-bash.mjs` — The Claude Code hook that calls `nirmiq_explain_command` MCP tool.

---

## 9. Data Flow

### A. Import Pipeline (most complex)

```
User → /workspaces/import (Client Component, useActionState)
  ↓ form submit
importProjectAction (Server Action)
  ↓ resolveProjectPath(input)
    → GitHub URL? → cloneOrPullRepo() → git clone/pull to data/imported-projects/<repo>
    → Local path?  → validate it exists
  ↓ analyzeProject({ projectPath, workspaceName, anthropicApiKey? })
    ├── IF no API key:
    │     detectStack() → reads package.json/go.mod/requirements.txt/Cargo.toml
    │     generateLocalAnalysisText() → curated questions + concepts by framework
    └── IF API key present:
          Anthropic claude-opus-4-8 → structured analysis text
    ↓ analyzeCode(projectPath)   [always runs, no API key needed]
          walks ≤300 source files × ≤80KB each
          12 DSA regex detectors → concept links with source snippets
          layer classifier → architecture graph nodes
          import edge scanner → graph edges
          workflow flow edges (routes → actions → services → DB)
    ↓ DB writes (all via services):
          createWorkspace()                → workspaces row
          createLearningMapWithContent()   → learning_maps row (graphJson, analysisRaw, modules, checkpoints)
          createQuestion() × N             → explain_back_questions rows
          createConceptLinkWithSource() × N → concept_links rows (sourceFile + codeSnippet)
  ↓ returns { workspaceId, workspaceName, questionsCreated, conceptsCreated }
Client shows success banner → 2s delay → router.push(/workspaces/:id)
```

### B. Standard Read (Server Component)

```
Browser → GET /workspaces/:id/learning-map
  ↓ Next.js Server Component (force-dynamic — bypasses cache on every request)
  ↓ Promise.all([getWorkspaceById(), getLearningMapByWorkspaceId(), getConceptLinksByWorkspaceId()])
  ↓ Each service → Drizzle query → better-sqlite3 (sync) → data/nirmiqlearn.db
  ↓ Parse JSON columns (modulesJson, checkpointsJson, graphJson)
  ↓ If map.graphJson exists → pass parsed KnowledgeGraphData to KnowledgeGraphLoader
      → next/dynamic(() => import("./KnowledgeGraph"), { ssr: false })
      → Browser downloads force-graph chunk and renders <canvas>
  ↓ HTML streamed to browser; page is interactive immediately except the canvas
```

### C. Standard Mutation (Server Action)

```
User fills form (e.g. AddQuestionForm)
  ↓ form action={addQuestionAction}
addQuestionAction (Server Action, "use server")
  ↓ getString/getUUID (lib/utils/server.ts) — safe extraction from FormData
  ↓ Zod schema validation (explain-back.schema.ts)
  ↓ createQuestion(workspaceId, parsed.data) → Drizzle INSERT → SQLite
  ↓ revalidatePath("/workspaces/:id/explain-back")
Next.js invalidates the page — next request re-renders with fresh DB state
```

### D. MCP / Vibe Coding Companion

```
User builds in Claude Code / Cursor / Windsurf
  ↓ Claude Code hooks fire: hooks/pre-bash.mjs (PostToolUse event)
  ↓ Calls nirmiq_explain_command MCP tool over stdio
  ↓ MCP server (mcp-server/index.ts) → createSessionLog() → session_logs row
  ↓ User opens /workspaces/:id/session-log in browser
  ↓ getSessionLogsByWorkspaceId() → reads session_logs → timeline view
```

---

## 10. Structural Issues / Improvement Candidates

| Issue | Location | Impact |
|---|---|---|
| `progressScore` never updates | `workspace.service.ts:calculateWorkspaceProgress` defined; nothing calls it to write | Progress bar always shows 0% |
| `conceptsJson` column is dead | `lib/db/schema.ts:37`; parsed in `learning-map.service.ts:69` | Column exists, always `"[]"`, never written |
| `updateWorkspace` / `archiveWorkspace` orphaned | `workspace.service.ts:70–92` | No UI, no action, no MCP tool triggers either |
| `getRecentSessionLogs` orphaned | `session-log.service.ts:57` | Exported but never imported anywhere |
| `getDebugLogById` orphaned | `debug-log.service.ts:47` | Exported but never imported anywhere |
| `updateWorkspaceSchema` unused in actions | `validators/workspace.schema.ts:23` | Defined but no action validates against it |

---

## 11. Config Files

| File | Purpose |
|---|---|
| `next.config.ts` | `serverExternalPackages: ["better-sqlite3"]` — **critical**, prevents Turbopack worker crash on dynamic routes |
| `drizzle.config.ts` | Points to `lib/db/schema.ts` + `lib/db/migrations/`; dialect `sqlite` |
| `tsconfig.json` | Strict mode; `@/` alias → project root |
| `instrumentation.ts` | Runs `runMigrations()` on server startup (nodejs runtime only) |
| `.mcp.json` | Local MCP server definition for this project's Claude Code session |
| `mcp-manifest.json` | Tool manifest for MCP server discovery |
| `package.json` | See `CLAUDE.md` for the exact command table |
