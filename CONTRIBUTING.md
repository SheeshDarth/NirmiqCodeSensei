# Contributing to NirmiqCodeSensei

Thanks for your interest! This is a local-first MVP — issues and PRs are welcome.

## Ground rules

- **Local-first, private by default.** No telemetry and no network calls in the core; the
  server binds to `127.0.0.1` only. Please don't add analytics or phone-home behaviour.
- **Reuse before you add.** Business logic lives in `lib/services/<domain>.service.ts` and
  every service function returns a `ServiceResult<T>`. Check for an existing function before
  writing a new one, and extend the right existing file rather than creating a parallel one.

## Development

```bash
git clone https://github.com/SheeshDarth/NirmiqCodeSensei.git
cd NirmiqCodeSensei
npm install
npm run dev        # http://127.0.0.1:3000
```

## Verification gate (must pass before every PR)

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

All four must be green. `npm test` runs the import-pipeline suite (node:test via tsx) against
an isolated temp database — it never touches your real `data/`.

## Commits

Conventional commit types: `feat` `fix` `docs` `style` `refactor` `test` `chore` `db`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · SQLite
(better-sqlite3) · Drizzle ORM · Zod · MCP SDK. There is **no component library** — components
are hand-rolled with the established dark palette.

## Reporting issues

- **Bugs:** open an issue with reproduction steps and your OS / Node version.
- **Security:** please read [SECURITY.md](SECURITY.md) and disclose responsibly — do **not**
  open a public issue for vulnerabilities.

## License

By contributing you agree that your contributions are licensed under the project's
[PolyForm Noncommercial 1.0.0](LICENSE.md) license.
