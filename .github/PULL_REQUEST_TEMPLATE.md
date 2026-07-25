## What this changes

<!-- One or two sentences. What problem does this solve? -->

## Why

<!-- Link the issue if there is one: Fixes #123 -->

## Verification gate

All four must pass before review:

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm test`

## Checklist

- [ ] Reused existing services/utilities rather than adding parallel ones
      (`lib/services/<domain>.service.ts`, `lib/utils.ts`)
- [ ] Service functions return `ServiceResult<T>` and don't throw across layers
- [ ] No telemetry, analytics, or new network calls in the core
- [ ] Database changes ship a generated migration (`npm run db:generate`)
- [ ] Docs updated if behaviour changed (README / CHANGELOG)

## How to test this

<!-- Steps a reviewer can follow to see it working. -->
