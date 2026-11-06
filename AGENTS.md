# NirmiqCodeSensei — Agent Context (Codex / Generic Agents)

## What This Project Is
NirmiqCodeSensei (formerly NirmiqCodeSensei) is a local-first web application that helps students understand AI-assisted projects instead of blindly copying them. It turns projects into guided learning systems with explain-back checks, debug logs, DSA bridges, and viva prep.

## Stack
- Framework: Next.js 16, App Router, TypeScript strict mode
- Styling: Tailwind CSS 4
- UI: shadcn/ui components
- Database: SQLite via Drizzle ORM
- Validation: Zod
- State: Zustand (UI-only, no persistent learning data in state)

## Folder Structure
```
app/              → Next.js App Router pages
components/       → UI components (layout/, ui/, workspace/, etc.)
lib/
  db/             → Drizzle schema, client, migrations
  services/       → Business logic (workspace, learning-map, explain-back, debug-log, export)
  validators/     → Zod schemas
docs/             → All product and technical documentation
data/             → SQLite database file (gitignored)
```

## Current Build Phase
Phase 1 — App Shell. See `docs/GRAPHIFY_MAP.md` for the full phase and file dependency graph.

## Rules for Agents
1. Read `docs/CONTEXT.md` before any task.
2. Read only the task-specific doc (PRD / TRD / UI_UX / DEBUGGING).
3. Locate relevant files via `docs/GRAPHIFY_MAP.md` before reading code. Do not scan everything.
4. Implement the smallest useful change for the task.
5. Run: lint → typecheck → build before completing.
6. Log architecture decisions in `docs/COUNCIL_REVIEW_LOG.md`.
7. Never commit `.env`, `*.db`, `node_modules`, or secrets.
8. Never push to remote unless explicitly instructed.
9. For code changes, add consequential implementation choices to `docs/decision.md` and update the affected runtime trace in `docs/flow.md`. Keep architecture/security council rulings in `docs/COUNCIL_REVIEW_LOG.md`; keep stable file relationships in `docs/GRAPHIFY_MAP.md`.
10. A substantial coding session means a feature or cross-module fix, a change spanning three or more files, or a change to architecture, dependencies, data flow, security, or user-visible behavior. At the end of each substantial coding session, quiz the user on the changed path and the main decision. Ask five short questions tied to the actual diff; pass requires at least 4/5 correct, including the core call/data-flow question. If the user misses the threshold, explain the gaps and retry with a fresh quiz before treating the learning check as passed. This is a learning gate, not a code-correctness check. Trivial edits and documentation-only sessions do not trigger it unless the user explicitly requests a quiz.

## Service Layer Pattern
All service functions must return:
```ts
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };
```

## Key Design Constraints
- Local-first: no forced cloud account in MVP
- No generic AI chatbot UI
- Every page must guide the user to the next learning action
- Dark premium academic UI (see `docs/UI_UX.md`)
- Mobile-responsive but desktop-first
