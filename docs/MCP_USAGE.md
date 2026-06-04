# MCP Usage Guide — Graphify + LLM Council

## 1. Purpose

The goal is to reduce wasted Claude context and tokens.

Use:
- Graphify MCP for codebase memory and targeted context retrieval.
- LLM Council MCP for second opinions on important technical decisions.

Do not use MCP tools randomly.
Use them only when they reduce confusion, prevent bad architecture, or avoid large context dumps.

## 2. Graphify Usage

Use Graphify when:
- Claude needs to understand existing code structure.
- You need dependency relationships.
- You need to find where a feature lives.
- You want to avoid pasting many files.
- You need to understand impact before editing.

Suggested commands/instructions:
```text
Use Graphify to inspect the codebase map for files related to [feature].
Return only the smallest set of files needed.
Do not load unrelated files.
```

Use before:
- Refactoring
- Adding feature to existing module
- Debugging unfamiliar issue
- Understanding architecture

Do not use Graphify for:
- Simple one-file edits
- Writing docs from scratch
- Tiny UI copy changes

## 3. LLM Council Usage

Use LLM Council when:
- Choosing architecture
- Reviewing TRD/PRD decisions
- Debugging a stubborn bug
- Reviewing security-sensitive code
- Checking database schema decisions
- Evaluating whether a feature is overengineered

Suggested prompt:
```text
Consult LLM Council for a concise technical review.

Question:
[decision/problem]

Context:
[short context only]

Constraints:
- local-first
- low complexity
- student-buildable
- TypeScript/Next.js
- avoid overengineering
- MVP first

Return:
1. Best recommendation
2. Risks
3. Simplest implementation path
4. What not to build yet
```

Do not use LLM Council for:
- Every component
- Simple styling
- Minor naming
- Generic code generation
- Tasks Claude can handle alone

## 4. Low-Context Protocol

For every Claude Code session:

1. Read docs/CONTEXT.md.
2. Read only the specific doc related to task.
3. Use Graphify to locate files.
4. Edit only required files.
5. Summarize changes.
6. Run checks.
7. Commit.

## 5. Token-Saving Rules

- Never paste full repo.
- Never ask Claude to “analyze everything” unless absolutely necessary.
- Keep docs as persistent memory.
- Ask Claude to update docs after meaningful changes.
- Use Graphify to locate files instead of dumping code.
- Use LLM Council only at decision checkpoints.
- Prefer small tasks over giant prompts.

## 6. MCP Safety

- Do not expose secrets/API keys to MCP tools.
- Do not allow tools to execute untrusted generated commands blindly.
- Review shell commands before running.
- Keep .env out of git.
- Avoid feeding malicious external content directly into tool instructions.
