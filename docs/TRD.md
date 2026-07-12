# Technical Requirements Document — NirmiqCodeSensei

## 1. Architecture Overview

NirmiqCodeSensei MVP should be a local-first Next.js application using SQLite for storage.

Recommended MVP architecture:

```text
Next.js App Router
    |
    |-- UI Pages
    |-- Server Actions / API Routes
    |-- Domain Services
    |-- SQLite + Drizzle ORM
    |-- Markdown Export Layer
```

## 2. Tech Stack

### Core
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- SQLite
- Drizzle ORM
- Zod
- Zustand

### Optional Later
- Tauri for desktop packaging
- FastAPI for heavy document parsing
- ChromaDB or LanceDB for embeddings
- Ollama for local LLM support
- GitHub API integration

## 3. Folder Structure

```text
NirmiqCodeSenseiOS/
  app/
    page.tsx
    dashboard/
      page.tsx
    workspaces/
      page.tsx
      [id]/
        page.tsx
    explain-back/
      page.tsx
    debug-lab/
      page.tsx
    settings/
      page.tsx

  components/
    layout/
    ui/
    workspace/
    learning-map/
    explain-back/
    debug-lab/
    dashboard/

  lib/
    db/
      schema.ts
      client.ts
      migrations/
    services/
      workspace.service.ts
      learning-map.service.ts
      explain-back.service.ts
      debug-log.service.ts
      export.service.ts
    validators/
      workspace.schema.ts
      debug-log.schema.ts
    utils.ts

  data/
    nirmiqcodesensei.db

  docs/
    PRD.md
    TRD.md
    CONTEXT.md
    UI_UX.md
    DEBUGGING.md
    MCP_USAGE.md
    GIT_WORKFLOW.md

  .claude/
    commands/
      build-next.md
      commit-after-work.md
      debug-feature.md
```

## 4. Database Schema

### workspaces
Fields:
- id
- title
- description
- type
- goal
- status
- progress_score
- created_at
- updated_at

Types:
- project
- dsa
- exam
- topic

Statuses:
- active
- paused
- completed
- archived

### learning_maps
Fields:
- id
- workspace_id
- title
- summary
- modules_json
- concepts_json
- checkpoints_json
- created_at
- updated_at

### explain_back_questions
Fields:
- id
- workspace_id
- learning_map_id
- question
- difficulty
- expected_points_json
- user_answer
- score
- confidence
- created_at
- updated_at

Confidence:
- red
- yellow
- green

### debug_logs
Fields:
- id
- workspace_id
- title
- error_message
- suspected_cause
- actual_cause
- fix_summary
- lesson_learned
- prevention_rule
- created_at
- updated_at

### daily_logs
Fields:
- id
- workspace_id
- date
- built_today
- understood_today
- unclear_topics
- bugs_faced
- next_action
- created_at
- updated_at

### concept_links
Fields:
- id
- workspace_id
- project_feature
- concept_name
- concept_type
- explanation
- practice_task
- created_at
- updated_at

## 5. Page Requirements

### 5.1 Home Page
Purpose:
- Explain product
- CTA to dashboard
- Show product philosophy

### 5.2 Dashboard
Must show:
- Active workspace
- Progress score
- Explain-back stats
- Weak concepts
- Debug lessons
- Recent logs

### 5.3 Workspaces Page
Must support:
- Create workspace
- View workspace cards
- Filter by type/status
- Open workspace detail

### 5.4 Workspace Detail
Must show:
- Overview
- Learning map
- Concepts
- Explain-back questions
- Debug logs
- Daily logs
- Export button

### 5.5 Explain-Back Page
Must support:
- Question display
- User answer
- Self-rating
- Save answer
- Mark confidence

### 5.6 Debug Lab
Must support:
- Create debug log
- Search logs
- Filter by project
- Show lesson learned

### 5.7 Settings
Must include:
- Local storage location
- Export options
- Theme mode
- Future AI provider settings

## 6. Service Layer

### workspace.service.ts
Functions:
- createWorkspace
- getWorkspaceById
- listWorkspaces
- updateWorkspace
- archiveWorkspace
- calculateWorkspaceProgress

### learning-map.service.ts
Functions:
- createLearningMap
- generateManualLearningMap
- getLearningMapByWorkspaceId
- updateLearningMap

### explain-back.service.ts
Functions:
- createQuestion
- answerQuestion
- scoreQuestionSelfRated
- getQuestionsByWorkspaceId
- getWeakQuestions

### debug-log.service.ts
Functions:
- createDebugLog
- listDebugLogs
- getDebugLogById
- updateDebugLog

### export.service.ts
Functions:
- exportWorkspaceMarkdown
- exportDebugLessonsMarkdown
- exportExplainBackMarkdown

## 7. State Management

Use Zustand for lightweight UI state only:
- selectedWorkspaceId
- currentDashboardFilter
- sidebarCollapsed
- theme preference

Do not store persistent learning data in Zustand. Use database.

## 8. Validation

Use Zod for:
- Workspace creation
- Debug log creation
- Explain-back answers
- Daily logs

## 9. Error Handling

Every service function must return typed result:

```ts
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };
```

## 10. Testing Strategy

MVP:
- Unit tests for services
- Zod validation tests
- Basic component rendering tests
- Manual acceptance testing

Later:
- Playwright E2E tests

## 11. Security

MVP stores local learning data only.
Do not store API keys in code.
Do not commit .env files.
Do not auto-run shell commands from user-uploaded content.
Do not trust pasted code or imported files.

## 12. Build Phases

### Phase 0: Repo Setup
- Initialize Next.js
- Configure TypeScript
- Configure Tailwind
- Configure shadcn/ui
- Add docs
- Add git workflow

### Phase 1: Shell UI
- Layout
- Sidebar
- Dashboard
- Empty states

### Phase 2: Database
- Drizzle setup
- SQLite schema
- Seed data
- CRUD services

### Phase 3: Workspaces
- Create/list/open workspace
- Workspace detail page

### Phase 4: Learning Maps
- Manual learning map creation
- Concepts and checkpoints

### Phase 5: Explain-Back
- Questions
- Answers
- Confidence tracking

### Phase 6: Debug Lab
- Debug logs
- Lessons learned
- Prevention rules

### Phase 7: Export
- Markdown export
- Portfolio/viva preparation export

### Phase 8: Polish
- UI refinement
- Accessibility
- Error states
- Documentation pass
