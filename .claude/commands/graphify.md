# Claude Command: Graphify — Locate Relevant Files

Use this command before every coding task to find the exact files you need
without scanning the whole repo.

## Instruction

You are working on NirmiqCodeSensei. Your job is to identify the **minimal
set of files** relevant to the task below, using the knowledge graph in
`docs/GRAPHIFY_MAP.md`.

**Task:** $ARGUMENTS

**Steps:**

1. Read `docs/GRAPHIFY_MAP.md` (the living codebase map).
2. Match the task against the **Feature → File Map** table and the
   **Service + Database Graph** to find every file that is touched,
   imported, or depended on.
3. Return the file list with a one-line reason for each entry.
4. **Do not read the files yet.** Do not load anything not in the list.
5. Wait for the user to confirm before proceeding.

**Output format:**

---
## Graphify: $ARGUMENTS

| File | Why it matters |
|------|----------------|
| `path/to/file.ts` | Short reason |
| ... | ... |

**Phase context:** [which phase owns this feature, and what is already done]

**Ready to read these files and implement?**
---

**Rules:**
- If the task spans multiple features, list files for each.
- If a file is not in the map yet, note it as `[new file — needs creating]`.
- Keep the list to 8 files or fewer. If more are needed, explain why.
- Never load `node_modules`, `.next`, or docs unrelated to the task.
