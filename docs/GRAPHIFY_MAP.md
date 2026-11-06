# Graphify Knowledge Graph — NirmiqCodeSensei

> This file is the living codebase map. Update it whenever a new file, module, or feature is added.
> AI tools should read this file INSTEAD of scanning the whole repo.
> Graphify MCP populates and queries this graph as code grows.

---

## How to Use This File

**Before coding:**
```
Read docs/GRAPHIFY_MAP.md.
Find the relevant node(s) for your task.
Read only those files. Do not load unrelated files.
```

**After coding:**
```
Update docs/GRAPHIFY_MAP.md with any new files or changed relationships.
```

For change rationale, use [`docs/decision.md`](decision.md). For real cross-file execution traces and the exact session change boundary, use [`docs/flow.md`](flow.md). Keep this map focused on stable file and module relationships.

---

## Phase Progress Graph

```mermaid
graph LR
    P0["✅ Phase 0\nRepo + Docs Setup"]
    P1["✅ Phase 1\nApp Shell"]
    P2["✅ Phase 2\nDatabase"]
    P3["✅ Phase 3\nWorkspaces"]
    P4["✅ Phase 4\nLearning Maps"]
    P5["✅ Phase 5\nExplain-Back"]
    P6["✅ Phase 6\nDebug Lab"]
    P7["✅ Phase 7\nDSA Bridge"]
    P8["✅ Phase 8\nExport"]
    P9["✅ Phase 9\nPolish"]

    P0 --> P1 --> P2 --> P3
    P3 --> P4
    P3 --> P5
    P3 --> P6
    P4 --> P5
    P5 --> P7
    P6 --> P7
    P7 --> P8
    P8 --> P9
```

---

## App Route Graph

```mermaid
graph TD
    Root["app/\nlayout.tsx"]
    Home["/ (Home)\napp/page.tsx"]
    Dashboard["  /dashboard\n  app/dashboard/page.tsx"]
    Workspaces["/workspaces\napp/workspaces/page.tsx"]
    WorkspaceDetail["/workspaces/[id]\napp/workspaces/[id]/page.tsx"]
    ExplainBack["/explain-back\napp/explain-back/page.tsx"]
    DebugLab["/debug-lab\napp/debug-lab/page.tsx"]
    DSABridge["/dsa-bridge\napp/dsa-bridge/page.tsx"]
    Settings["/settings\napp/settings/page.tsx"]
    Decisions["/workspaces/[id]/decisions\napp/(app)/workspaces/[id]/decisions/page.tsx"]
    FlowExport["/workspaces/[id]/flow\napp/(app)/workspaces/[id]/flow/route.ts"]

    Root --> Home
    Root --> Dashboard
    Root --> Workspaces
    Workspaces --> WorkspaceDetail
    WorkspaceDetail --> Decisions
    WorkspaceDetail --> FlowExport
    Root --> ExplainBack
    Root --> DebugLab
    Root --> DSABridge
    Root --> Settings
```

---

## Component Dependency Graph

```mermaid
graph TD
    Layout["components/layout/\nAppShell, Sidebar, Topbar"]
    UI["components/ui/\nshadcn: Button Card Badge\nInput Textarea Tabs Dialog"]
    WorkspaceC["components/workspace/\nWorkspaceCard, CreateForm\nWorkspaceDetail"]
    LearningMapC["components/learning-map/\nMapView, ModuleCard\nCheckpointList"]
    ExplainBackC["components/explain-back/\nQuestionCard, AnswerBox\nConfidenceBadge"]
    DebugC["components/debug-lab/\nDebugLogCard, LogForm\nLessonView"]
    DashboardC["components/dashboard/\nStatsCard, ProgressRing\nWeakConceptsList"]

    Layout --> UI
    WorkspaceC --> UI
    LearningMapC --> UI
    ExplainBackC --> UI
    DebugC --> UI
    DashboardC --> UI
```

---

## Service + Database Graph

```mermaid
graph TD
    DB[("data/\nnirmiqcodesensei.db\nSQLite")]

    Schema["lib/db/schema.ts\nDrizzle table definitions"]
    Client["lib/db/client.ts\nDrizzle client instance"]
    Migrations["lib/db/migrations/\nSQL migration files"]

    WS["lib/services/\nworkspace.service.ts"]
    LM["lib/services/\nlearning-map.service.ts"]
    EB["lib/services/\nexplain-back.service.ts"]
    DL["lib/services/\ndebug-log.service.ts"]
    EX["lib/services/\nexport.service.ts"]

    ZWS["lib/validators/\nworkspace.schema.ts"]
    ZDL["lib/validators/\ndebug-log.schema.ts"]

    DB --> Client
    Schema --> Client
    Migrations --> DB
    Client --> WS
    Client --> LM
    Client --> EB
    Client --> DL
    Client --> EX
    ZWS --> WS
    ZDL --> DL
```

---

## Database Schema Graph

```mermaid
erDiagram
    workspaces {
        text id PK
        text title
        text description
        text type
        text goal
        text status
        integer progress_score
        integer created_at
        integer updated_at
    }
    learning_maps {
        text id PK
        text workspace_id FK
        text title
        text summary
        text modules_json
        text concepts_json
        text checkpoints_json
        integer created_at
        integer updated_at
    }
    explain_back_questions {
        text id PK
        text workspace_id FK
        text learning_map_id FK
        text question
        text difficulty
        text expected_points_json
        text user_answer
        integer score
        text confidence
        integer created_at
        integer updated_at
    }
    debug_logs {
        text id PK
        text workspace_id FK
        text title
        text error_message
        text suspected_cause
        text actual_cause
        text fix_summary
        text lesson_learned
        text prevention_rule
        integer created_at
        integer updated_at
    }
    daily_logs {
        text id PK
        text workspace_id FK
        text date
        text built_today
        text understood_today
        text unclear_topics
        text bugs_faced
        text next_action
        integer created_at
        integer updated_at
    }
    concept_links {
        text id PK
        text workspace_id FK
        text project_feature
        text concept_name
        text concept_type
        text explanation
        text practice_task
        integer created_at
        integer updated_at
    }
    decision_records {
        text id PK
        text workspace_id FK
        text title
        text chosen_option
        text alternatives_json
        text rationale
        text accepted_tradeoff
        text affected_paths_json
        integer created_at
    }

    workspaces ||--o{ learning_maps : "has"
    workspaces ||--o{ explain_back_questions : "has"
    workspaces ||--o{ debug_logs : "has"
    workspaces ||--o{ daily_logs : "has"
    workspaces ||--o{ concept_links : "has"
    workspaces ||--o{ decision_records : "has"
    learning_maps ||--o{ explain_back_questions : "generates"
```

---

## Feature → File Map (Quick Reference)

| Feature | Files to Read |
|---------|--------------|
| Workspace CRUD | `lib/services/workspace.service.ts`, `lib/db/schema.ts`, `app/workspaces/page.tsx`, `components/workspace/` |
| Learning Map | `lib/services/learning-map.service.ts`, `components/learning-map/`, `app/workspaces/[id]/page.tsx` |
| Explain-Back | `lib/services/explain-back.service.ts`, `components/explain-back/`, `app/explain-back/page.tsx` |
| Debug Lab | `lib/services/debug-log.service.ts`, `components/debug-lab/`, `app/debug-lab/page.tsx` |
| Dashboard | `components/dashboard/`, `app/dashboard/page.tsx` |
| Export | `lib/services/export.service.ts` |
| Decision Log | `lib/validators/decision.schema.ts`, `lib/services/decision.service.ts`, `mcp-server/index.ts`, `app/(app)/workspaces/[id]/decisions/` |
| Flow Markdown Export | `lib/services/export.service.ts`, `lib/services/learning-map.service.ts`, `app/(app)/workspaces/[id]/flow/route.ts` |
| Layout / Navigation | `components/layout/`, `app/layout.tsx` |
| DB Schema | `lib/db/schema.ts`, `lib/db/client.ts` |
| Development / TypeScript Config | `package.json`, `tsconfig.json`, `next.config.ts`, `instrumentation.ts` |
| Validation | `lib/validators/` |

---

## Current File Status

| File | Phase | Status |
|------|-------|--------|
| `app/page.tsx` | 0 | ✅ Done |
| `app/layout.tsx` | 0 | ✅ Done |
| `app/globals.css` | 0 | ✅ Done |
| `app/(app)/layout.tsx` | 1 | ✅ Done |
| `app/(app)/dashboard/page.tsx` | 1 | ✅ Done |
| `app/(app)/workspaces/page.tsx` | 1 | ✅ Done |
| `app/(app)/explain-back/page.tsx` | 1 | ✅ Done |
| `app/(app)/debug-lab/page.tsx` | 1 | ✅ Done |
| `app/(app)/dsa-bridge/page.tsx` | 1 | ✅ Done |
| `app/(app)/daily-log/page.tsx` | 1 | ✅ Done |
| `app/(app)/settings/page.tsx` | 1 | ✅ Done |
| `components/layout/AppShell.tsx` | 1 | ✅ Done |
| `components/layout/Sidebar.tsx` | 1 | ✅ Done |
| `components/layout/Topbar.tsx` | 1 | ✅ Done |
| `lib/db/schema.ts` | 2 | ✅ Done |
| `lib/db/client.ts` | 2 | ✅ Done |
| `lib/db/migrate.ts` | 2 | ✅ Done |
| `lib/db/migrations/` | 2 | ✅ Done |
| `lib/types.ts` | 2 | ✅ Done |
| `drizzle.config.ts` | 2 | ✅ Done |
| `instrumentation.ts` | 2 | ✅ Done |
| `lib/validators/workspace.schema.ts` | 3 | ✅ Done |
| `lib/services/workspace.service.ts` | 3 | ✅ Done |
| `app/(app)/workspaces/page.tsx` | 3 | ✅ Done |
| `app/(app)/workspaces/new/page.tsx` | 3 | ✅ Done |
| `app/(app)/workspaces/[id]/page.tsx` | 3 | ✅ Done |
| `app/(app)/workspaces/actions.ts` | 3 | ✅ Done |
| `components/workspace/WorkspaceCard.tsx` | 3 | ✅ Done |
| `components/workspace/CreateWorkspaceForm.tsx` | 3 | ✅ Done |
| `lib/validators/learning-map.schema.ts` | 4 | ✅ Done |
| `lib/services/learning-map.service.ts` | 4 | ✅ Done |
| `app/(app)/workspaces/[id]/learning-map/page.tsx` | 4 | ✅ Done |
| `app/(app)/workspaces/[id]/learning-map/actions.ts` | 4 | ✅ Done |
| `components/learning-map/CreateMapForm.tsx` | 4 | ✅ Done |
| `components/learning-map/AddModuleForm.tsx` | 4 | ✅ Done |
| `components/learning-map/ModuleCard.tsx` | 4 | ✅ Done |
| `components/learning-map/AddCheckpointForm.tsx` | 4 | ✅ Done |
| `lib/utils.ts` | 5 | ✅ Done |
| `lib/validators/explain-back.schema.ts` | 5 | ✅ Done |
| `lib/services/explain-back.service.ts` | 5 | ✅ Done |
| `app/(app)/workspaces/[id]/explain-back/page.tsx` | 5 | ✅ Done |
| `app/(app)/workspaces/[id]/explain-back/actions.ts` | 5 | ✅ Done |
| `app/(app)/explain-back/page.tsx` | 5 | ✅ Done |
| `components/explain-back/QuestionCard.tsx` | 5 | ✅ Done |
| `components/explain-back/AddQuestionForm.tsx` | 5 | ✅ Done |
| `lib/validators/debug-log.schema.ts` | 6 | ✅ Done |
| `lib/services/debug-log.service.ts` | 6 | ✅ Done |
| `app/(app)/workspaces/[id]/debug-lab/actions.ts` | 6 | ✅ Done |
| `app/(app)/workspaces/[id]/debug-lab/page.tsx` | 6 | ✅ Done |
| `components/debug-lab/CreateDebugLogForm.tsx` | 6 | ✅ Done |
| `components/debug-lab/DebugLogCard.tsx` | 6 | ✅ Done |
| `lib/validators/concept-link.schema.ts` | 7 | ✅ Done |
| `lib/services/concept-link.service.ts` | 7 | ✅ Done |
| `app/(app)/workspaces/[id]/dsa-bridge/actions.ts` | 7 | ✅ Done |
| `app/(app)/workspaces/[id]/dsa-bridge/page.tsx` | 7 | ✅ Done |
| `components/dsa-bridge/AddConceptLinkForm.tsx` | 7 | ✅ Done |
| `components/dsa-bridge/ConceptLinkCard.tsx` | 7 | ✅ Done |
| `lib/services/export.service.ts` | 8 | ✅ Done |
| `app/(app)/workspaces/[id]/export/route.ts` | 8 | ✅ Done |
| `lib/validators/daily-log.schema.ts` | 9 | ✅ Done |
| `lib/services/daily-log.service.ts` | 9 | ✅ Done |
| `app/(app)/workspaces/[id]/daily-log/actions.ts` | 9 | ✅ Done |
| `app/(app)/workspaces/[id]/daily-log/page.tsx` | 9 | ✅ Done |
| `components/daily-log/CreateDailyLogForm.tsx` | 9 | ✅ Done |
| `components/daily-log/DailyLogEntry.tsx` | 9 | ✅ Done |
| `app/(app)/daily-log/page.tsx` | 9 | ✅ Done |
| `app/(app)/dashboard/page.tsx` | 9 | ✅ Done |
| `lib/validators/decision.schema.ts` | 10 | ✅ Done |
| `lib/services/decision.service.ts` | 10 | ✅ Done |
| `app/(app)/workspaces/[id]/decisions/page.tsx` | 10 | ✅ Done |
| `app/(app)/workspaces/[id]/decisions/export/route.ts` | 10 | ✅ Done |
| `app/(app)/workspaces/[id]/flow/route.ts` | 10 | ✅ Done |
| `lib/db/migrations/0012_complete_marauders.sql` | 10 | ✅ Done |

> Update this table after completing each file.


## Guided pathway implementation (2026-10-28)

| Capability | Files |
|---|---|
| Evidence/identity contracts and legacy normalization | lib/pathways/shared.ts, snapshot.ts |
| Bounded static calls and local alias configuration | lib/pathways/static-calls.ts |
| Snapshot/freshness and confined source | lib/services/pathway.service.ts, source-view.service.ts |
| Immutable review/attempt persistence | lib/services/pathway-learning.service.ts |
| Study catalog, user prerequisites and cycle checks | lib/services/study-path.service.ts |
| Canonical guided UI and history | components/learning-map/LearningMapExperience.tsx, components/explain-back/PathwayAttemptHistory.tsx |
| Source / learning APIs | app/(app)/workspaces/[id]/source/route.ts, pathway/route.ts |
| Durable schema | pathway_reviews, pathway_attempts, study_nodes, study_edges; migration 0013 |
| Behavioral/security/refresh fixtures | tests/pathways.test.mts |

Learning Map page → pathway snapshot/freshness → guided UI → confined source or learner-record APIs. Analysis → snapshot builder → bounded compiler → transactional map swap. Legacy Feature Trace redirects to Learning Map. See LEARNING_MAP_MASTER_PLAN.md for rollout status.
