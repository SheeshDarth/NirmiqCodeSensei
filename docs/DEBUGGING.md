# Debugging Guide — NirmiqCodeSensei

## 1. Debugging Philosophy

Debugging is not just fixing errors.
In NirmiqCodeSensei, every bug must become:
- a diagnosis exercise
- a learning artifact
- a future prevention rule

## 2. Standard Debugging Flow

When a bug appears:

1. Read the exact error.
2. Identify which layer it belongs to:
   - UI
   - state
   - service
   - database
   - validation
   - routing
   - build/config
3. Reproduce it.
4. Write a hypothesis.
5. Check the smallest possible area.
6. Fix one cause at a time.
7. Run tests/typecheck/lint.
8. Add a debug log.
9. Commit the fix.

## 3. Debug Log Template

```md
# Debug Log

## Bug
What happened?

## Error Message
Paste exact error.

## Context
What were you trying to do?

## Suspected Cause
What did you initially think?

## Actual Cause
What was really wrong?

## Fix
What changed?

## Lesson Learned
What did this teach?

## Prevention Rule
How to avoid this next time?
```

## 4. Common Bug Areas

### Next.js Routing
Symptoms:
- Page not loading
- 404
- Params undefined

Checklist:
- Is file path correct?
- Is it under app/?
- Is dynamic route named correctly?
- Is client/server component boundary correct?

### TypeScript
Symptoms:
- Type mismatch
- Unknown property
- Possibly undefined

Checklist:
- Check Zod schema
- Check inferred types
- Avoid any
- Use explicit return types in services

### Database
Symptoms:
- Insert fails
- Data not appearing
- Migration errors

Checklist:
- Schema field names
- Drizzle migration state
- SQLite file path
- Required fields
- Default timestamps

### UI State
Symptoms:
- UI does not update
- wrong selected workspace
- stale data

Checklist:
- Is persistent data in DB?
- Is UI-only state in Zustand?
- Is data refetched after mutation?

### Forms
Symptoms:
- Submit does nothing
- Invalid data saved
- Errors not displayed

Checklist:
- Zod validation
- Required fields
- Submit handler
- Error UI
- Loading state

### Next.js development bundler cache (Windows)

Symptoms can include `MODULE_UNPARSABLE` for `instrumentation.ts` even though the file exists, failed app-endpoint writes, or a “Next.js package not found” message after switching between Webpack and Turbopack.

Check the actual CLI banner to identify the active bundler. Next 16 writes development artifacts under `.next/dev`; switching bundlers while reusing that cache can leave output from the previous bundler. Reproduce with the same routes, then stop the server and rename `.next/dev` to a backup before starting the alternate bundler. Retain the backup instead of deleting it. If the clean-cache run works, keep the project's normal dev script pinned to one bundler and verify that command on the target routes. Do not change `instrumentation.ts` or upgrade Next.js based on the stale-cache error alone.

### TypeScript errors inside imported repositories

If `npm run typecheck` reports missing aliases, dependencies, or implicit `any` errors under `data/imported-projects/`, check `tsconfig.json` before installing packages or editing the imported project. These files are external user data; exclude `data/` from the host app's TypeScript program and leave the imported source/dependencies unchanged.

## 5. Claude Code Debug Prompt

Use this when debugging:

```text
Debug this issue with minimum context usage.

Rules:
1. Do not scan the whole repo unless needed.
2. Use Graphify first to identify related files and dependencies.
3. Inspect only the smallest relevant files.
4. State your hypothesis before editing.
5. Make the smallest safe fix.
6. Run relevant checks.
7. Update docs/DEBUGGING.md if the bug teaches a reusable lesson.
8. Commit the change after verification.

Issue:
[paste issue here]

Observed behavior:
[paste behavior]

Expected behavior:
[paste expected]
```

## 6. Commit Messages for Bugs

Use:
```bash
git commit -m "fix: resolve workspace creation validation bug"
git commit -m "fix: correct dashboard progress calculation"
git commit -m "fix: handle empty learning map state"
```
