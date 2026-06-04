# Debugging Guide — NirmiqLearn OS

## 1. Debugging Philosophy

Debugging is not just fixing errors.
In NirmiqLearn OS, every bug must become:
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
