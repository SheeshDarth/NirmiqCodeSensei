# Git Workflow — NirmiqCodeSensei

## 1. Repository

Target:
https://github.com/SheeshDarth/NirmiqCodeSensei

## 2. Initial Setup

```bash
git clone https://github.com/SheeshDarth/NirmiqCodeSensei.git
cd NirmiqCodeSensei
```

If repo is empty:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir false
git add .
git commit -m "chore: initialize Next.js project"
git push origin main
```

## 3. Branching

For solo MVP, use main directly only if disciplined.

Better:
```bash
git checkout -b feature/workspace-dashboard
```

After feature:
```bash
git checkout main
git merge feature/workspace-dashboard
git push origin main
```

## 4. Commit Rule

After every meaningful work unit:

```bash
git status
npm run lint
npm run typecheck
npm test
git add .
git commit -m "type: concise message"
git push
```

If tests are not configured yet:
```bash
npm run lint
npm run build
```

## 5. Commit Types

Use:
- feat: new feature
- fix: bug fix
- docs: documentation
- style: UI/style only
- refactor: code restructure without behavior change
- test: tests
- chore: config/setup
- db: database schema/migration

Examples:
```bash
git commit -m "feat: add workspace creation flow"
git commit -m "db: add learning map schema"
git commit -m "docs: update product requirements"
git commit -m "fix: handle empty dashboard state"
```

## 6. Claude Code Commit Instruction

Always tell Claude:

```text
After finishing this task:
1. Run relevant checks.
2. Show git diff summary.
3. Commit the changes with a clear conventional commit message.
4. Do not push unless I explicitly ask.
```

Use push separately:
```bash
git push origin main
```

## 7. Never Commit

Do not commit:
- .env
- API keys
- node_modules
- database with private data
- local logs
- generated temp files
- secrets
