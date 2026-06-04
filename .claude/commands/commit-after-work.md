# Claude Command: Commit After Work

Review the current changes and commit them safely.

Steps:
1. Run git status.
2. Summarize changed files.
3. Run relevant checks:
   - npm run lint
   - npm run typecheck
   - npm run build
4. If checks fail, fix only issues caused by current changes.
5. Commit using a clear conventional commit message.
6. Do not push unless explicitly asked.

Work summary:
$ARGUMENTS
