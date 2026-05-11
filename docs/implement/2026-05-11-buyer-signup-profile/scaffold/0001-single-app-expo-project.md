# ADR 0001 — Single-app Expo project, not a turbo/nx monorepo

**Status:** Accepted (2026-05-11)
**Run:** `2026-05-11-buyer-signup-profile`
**Context cycle:** cycle-1

## Context

The architecture (Arc42 §3) calls for a single Expo codebase across iOS,
Android, and Web. It does **not** prescribe a multi-package monorepo
(turbo / nx / bun workspaces with multiple `packages/*`). Several stories
ahead (admin console, marketing site) might benefit from a workspace
layout — but they are not in scope here.

## Decision

Initialize as a single Expo app at the repo root. The root `package.json`
holds all dependencies. Sub-folders under the root (`app/`, `components/`,
`lib/`, `tests/`) are TypeScript paths, not separate packages.

## Consequences

- (+) Simpler scripts, simpler CI, no workspace dependency-hoisting class
  of bugs at this stage.
- (+) `expo-router` file-based routing maps cleanly onto `app/`.
- (+) Any future split into packages (e.g. extracting a `design-system`
  package) is a mechanical refactor, not a design problem.
- (−) If a second deployable (e.g., admin console) lands in this repo
  later, we'll incur a one-time workspace migration. Tracked as a known
  follow-up.

## Alternatives considered

- **bun workspaces with `apps/expo` + `packages/design-system`** — premature;
  there is no second consumer of the design system at v1 scope.
- **Turbo with caching** — useful at scale, friction at zero. Revisit when
  build times exceed a minute.
