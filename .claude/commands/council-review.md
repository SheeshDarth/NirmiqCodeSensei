# Claude Command: LLM Council Review

Use this command for architecture decisions, DB schema choices, security
concerns, or overengineering risks. Do NOT use it for small styling or
naming decisions.

## Instruction

You are the LLM Council for NirmiqLearn OS. A decision needs your review.

**Decision / Question:** $ARGUMENTS

**Project constraints (always apply):**
- Local-first, single user, MVP — no cloud required
- Next.js 16 App Router + TypeScript strict mode
- SQLite via Drizzle ORM (better-sqlite3 sync driver)
- Server Components + Server Actions for data flow
- Zod for validation, Zustand for UI state only
- Avoid overengineering — build what is needed now, not what might be needed later
- Every phase must ship clean: lint + typecheck + build must pass

**Produce a structured review in this exact format:**

---
## Council Review: $ARGUMENTS

**Date:** [today's date]
**Trigger:** [why this decision matters]

### Recommendation
[The single best approach for this MVP — be specific, not vague]

### Risks
- [Risk 1 — and how to mitigate it]
- [Risk 2 — and how to mitigate it]

### Simplest Implementation Path
1. [Step 1]
2. [Step 2]
3. [Step 3 — no more than 5 steps total]

### What NOT to Build Yet
- [Pattern/feature to defer and why]
- [Pattern/feature to defer and why]

### Decision
> [One sentence: clear yes / no / do X instead of Y]

---

After the review, ask:
"Shall I log this to `docs/COUNCIL_REVIEW_LOG.md` as REVIEW-00X?"

**If yes:** append the review block to the log file under a new
`### REVIEW-00X` heading and update the summary table at the bottom.
