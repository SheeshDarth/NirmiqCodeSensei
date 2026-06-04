# Low-Context Claude Code Workflow

## Goal

Build NirmiqLearn OS without wasting Claude's context window.

## Golden Rule

Claude should never need the entire project in context. It should use:
- docs as memory
- Graphify as codebase map
- LLM Council for rare decision reviews
- git commits as checkpoints

## Standard Session Start

Paste this at the start of a Claude Code session:

```text
You are working on NirmiqLearn OS.

Before coding:
1. Read docs/CONTEXT.md.
2. Read only the specific doc relevant to my task.
3. Use Graphify to find relevant files instead of scanning the full repo.
4. Do not load unrelated files.
5. Make a small plan.
6. Implement the smallest useful change.
7. Run checks.
8. Commit after the work.

Task:
[insert task]
```

## Task Size Rule

Good task:
- “Add workspace creation form.”
- “Create SQLite schema for workspaces.”
- “Build dashboard empty state.”
- “Add debug log form.”

Bad task:
- “Build the whole app.”
- “Analyze everything and make it perfect.”
- “Refactor the full codebase.”

## Context Budget Rule

For each task:
- 1 context doc
- 1 related technical doc
- 3–8 relevant source files max
- Graphify query if unsure
- LLM Council only for architecture/debug review

## When to Use Graphify

Ask:
```text
Use Graphify to identify the files related to [feature/bug]. Return a short file list and explain why each file matters. Do not read files yet.
```

Then:
```text
Read only these files and implement the task.
```

## When to Use LLM Council

Ask:
```text
Consult LLM Council on this architecture decision. Keep context short and return a practical MVP recommendation.
```

Use for:
- database schema decisions
- local-first architecture
- AI provider architecture
- security review
- stubborn bug
- major refactor

## End-of-Task Checklist

Claude must output:
```text
## Work Completed
- ...

## Files Changed
- ...

## Checks Run
- ...

## Git Commit
- commit hash/message

## Next Suggested Task
- ...
```
