# NirmiqLearn OS

NirmiqLearn OS is a local-first learning operating system for students who build AI-assisted projects but still want to preserve deep understanding, analytical thinking, DSA foundations, and exam/project mastery.

It is designed for:
- Students who vibe-code projects using Claude, ChatGPT, Gemini, Cursor, etc.
- Students who want to understand the code they generate.
- Engineering students preparing for exams, interviews, DSA, and project explanations.
- Builders who want a personal learning + project comprehension OS.

## Core Idea

NirmiqLearn OS converts any project, document, topic, or codebase into a structured learning path. It helps the user learn by doing, questioning, explaining, debugging, revising, and proving understanding.

## MVP Modules

1. Project Ingestion
2. Codebase Understanding
3. AI-Assisted Project Learning
4. DSA + Analytical Thinking Trainer
5. Explain-Back Mode
6. Exam/Interview Prep Mode
7. Learning Graph
8. Progress Dashboard
9. Local Notes + Memory
10. Debugging Coach

## Recommended Stack

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand

Backend:
- Next.js API routes for MVP
- SQLite with Drizzle ORM
- Optional later: FastAPI service for document parsing and local model workflows

AI Layer:
- Claude Code for implementation
- Graphify MCP for codebase graph/context lookup
- LLM Council MCP for architectural review, bug review, and decision validation

Storage:
- SQLite locally
- File-system based project/document storage
- Markdown-based learning logs

## Git Repository

Target repository:
https://github.com/SheeshDarth/NirmiqLearnOS

## Development Rule

After every meaningful unit of work:
1. Run tests/lint/typecheck if available.
2. Update relevant docs.
3. Commit with a clear message.
4. Do not batch unrelated changes in one commit.

Example:
```bash
git add .
git commit -m "feat: add project ingestion flow"
```
