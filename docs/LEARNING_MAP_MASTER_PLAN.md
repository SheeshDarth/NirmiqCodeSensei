# Learning Map Master Plan

Approved: 2026-10-28. Audience: students understanding imported AI-assisted projects.

## Chosen product behavior

Code walkthroughs lead the Learning Map. Explore map supplies context; Study path presents editable educational prerequisites. Source inspection stays in the app, read-only and bounded. Written explanations use a local, transparent rubric; confidence is not externally verified mastery.

## Evidence and identity foundation

Versioned snapshots live in learning_maps.feature_traces_json. Legacy bare arrays normalize without rewriting saved records. Analysis ID identifies a generated snapshot; file/qualified-symbol keys identify targets; content hashes identify assessed material. Coverage records scan and parser limits. A file export is not treated as an invoked function. Import suggestions, syntax imports and possible static calls remain distinguishable. Stops disclose limits, missing continuation, cycles or unknown legacy reasons.

Refresh prepares analysis before a short synchronous transaction replaces generated rows. Previously answered questions, unmatched learning material, manual modules/checkpoints and independently stored pathway records survive. Analyzer upgrades invalidate the metadata-only fast path. Filesystem checks and optional network analysis finish outside the write transaction.

## Delivery stages and technical status

| Stage | Deliverable | Status |
|---|---|---|
| 1 | Evidence normalization, identities, hashes, coverage, stop reasons, compatibility, transactional refresh | Implemented; verification recorded below |
| 2 | Canonical walkthrough, source viewer, graph projection/highlighting, legacy redirect, freshness and missing-source states | Implemented; browser verification recorded below |
| 3 | Durable reviewed steps, immutable written attempts, criterion assessment, original context/history | Implemented; automated persistence checks |
| 4 | Bounded JS/TS compiler resolution, imported aliases/reexports/namespaces, explicit unresolved calls and branch selection | Implemented; performance and fixture checks recorded below |
| 5 | Local catalog suggestions, accepted prerequisite levels, user edits/order, rejection persistence and cycle prevention | Implemented; automated persistence checks |

Stages were built in one authorized coding session and are subject to the same final learning quiz. No human usability study has been conducted; technical completion does not establish learning effectiveness.

## Canonical UI and data flow

/workspaces/:id/learning-map loads the map, normalized snapshot and metadata freshness. The client selects path/step/branches using URL state. Walkthrough mode shows a numbered list and explanation/source pane. Explore mode lazily mounts the current graph, projects selected files omitted by overview pruning, and highlights the active step. Source reads resolve a server-owned analysis target, never a submitted filesystem path. Old /feature-trace links redirect to the canonical view. Existing module/checkpoint forms remain available.

The source viewer supports scanned code extensions, rejects dot/credential directories and links/junctions, confines real paths, checks descriptor identity and read stability, rejects binary/invalid UTF-8 and files over 80 KB, and returns at most 120 lines. It never executes code or sends it to an AI service. Matching hashes validate anchors; changed or unverified source has explicit labels. Cross-site browser reads/writes are rejected and responses are uncached.

## Learning loop

Reviewed, explanation written and self-assessed ready are separate. Five criteria score 0–2: entry purpose, relationship evidence, data boundary, failure/branch reasoning, and uncertainty/coverage. An explicit unknown earns credit only when its evidence limitation and consequence are explained. At least 8/10 and full scores on relationship evidence and uncertainty give Self-assessed ready only for matching source. Each retry appends an immutable attempt with rubric, original path references and source hashes. Changed/missing targets retain history and require review. Pathway counts do not inflate existing workspace progress.

## Static analysis boundary

The existing TypeScript compiler is a runtime dependency. Its host reads only the bounded in-memory source corpus; no imported build, plugin or application executes. Direct lexical calls, supported namespace calls, named/default functions and assigned arrow functions can resolve. Dynamic receiver dispatch and unsupported calls remain unresolved. Imports and calls remain distinct, and neither proves runtime order. Local ts/jsconfig path mappings are read safely; external extends/plugins are not loaded. At most 100 reachable JS/TS files are parsed, prioritizing entry files. Relationship processing/storage uses 5,000-edge budgets, and static recommendations expose at most 128 entry functions; limits are explicitly reported. Static paths display six steps at a time and stop after 24 unique steps; cycles are explicit. Import suggestions retain the initial eight-recommendation/six-hop limits and disclose partial coverage.

## Study prerequisites

Suggestions use a versioned local concept catalog, not imports. Modules and recognized concepts can become study topics on explicit Update suggestions. Proposed edges do not affect order before acceptance. Manual ordering of independent topics does not imply dependency. Accept/reject/add/remove/rename/reposition actions persist separately from generated maps. Rejections and edits survive synchronization and refresh; cycles and foreign-workspace references are rejected. Disappeared references remain visibly unavailable rather than silently removed. Rejected suggestions can be explicitly accepted later.

## Verification and release gates

Use isolated temporary projects/databases. Cover legacy and malformed snapshots, actual call targets, aliases/reexports/shadowing/namespace calls, unsupported dispatch, branches/cycles/caps, graph pruning, source containment/junctions/size/binary/hash changes, stale analysis IDs, rollback, preserved retries and prerequisites. Run lint, typecheck, build and tests; check standalone/MCP packaging when runtime dependencies change. Browser checks must cover navigation, source, branch selection, assessments, study edits, refresh, mobile and keyboard usability.

A five-student study remains an empirical release gate: at least four beginners unfamiliar with fixtures should independently find an entry, follow a relationship, inspect source, distinguish evidence levels and recover their saved explanation. The initial rubric threshold is provisional. Do not claim measured learning improvement without this study.

## Council decisions

LLM Council advisor/anonymous peer review and Consciousness Council perspectives selected the order: evidence → walkthrough/source → durable learning → deeper static calls → editable prerequisites. The central tension is early value versus overstated precision. Preserve visible uncertainty and learner-owned history throughout. Live runtime tracing, forced AI grading and a replacement graph engine are outside this implementation.

## Verification results

Lint, typecheck, the production build and all 47 isolated tests pass. Standalone packaging passed its forbidden-content guard (68.5 MB); MCP bundle build passed and its stdio handshake exposed 13 tools with a successful workspace summary. Packaged-server HTTP checks passed for the canonical map (200), legacy redirect (307), source preview, cross-site rejection, stale analysis rejection, review persistence, immutable attempts, changed-source readiness rejection, prerequisite-cycle rejection and Markdown export. The temporary preview server was stopped afterward. Source/static-call cap, ambiguous lexical identity, immutable history, cycle, stale-source and refresh rollback checks are included. Browser interaction could not be checked through the available Playwright connector (configured Chrome missing); automatic approval review blocked a headless Edge debugging launch with “blocked by policy.” No browser-interaction or accessibility completion is claimed. A five-beginner evaluation and rubric calibration are pending. See BENCHMARKS.md for the 300-file fixture measurements.
