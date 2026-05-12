# ADR-0005 — Migrations: drizzle-kit with committed history

**Status:** Accepted
**Date:** 2026-05-11
**Run:** 2026-05-11-backend-scaffold-baseline

## Context

Schema lives in TypeScript (Drizzle). We need a migration mechanism that
turns schema diffs into reviewable SQL, tracks applied state per
environment, and works against Neon branches in dev.

## Decision

Use **`drizzle-kit generate`** to produce SQL migrations from schema
changes. Migration files are committed to `drizzle/`:

- `drizzle/0000_init.sql` — first migration (users + seller_accounts).
- `drizzle/meta/_journal.json` — drizzle-kit's bookkeeping.
- `drizzle.config.ts` — schema path, output dir, dialect, driver.

Migrations are **generated and reviewed** in PRs. Application of
migrations to environments is **deferred** to a follow-up story —
specifically, a CI/deploy step that runs `drizzle-kit migrate` against
the target environment. For this story, applying the initial migration
to dev Neon branches is documented in the README (manual step).

## Consequences

**Positive:**
- SQL is reviewable. Drizzle's diff output catches accidental destructive
  changes (column drops, type narrowings).
- Migration history is durable. New environments can be initialized by
  replaying the journal.
- Schema-as-code remains the source of truth; SQL is the deterministic
  artifact.

**Negative:**
- Manual `drizzle-kit migrate` step for dev means new contributors run
  it once after `bun install`. Captured in README.
- No automatic migration application in CI yet. Risk: a PR adds a
  schema change but forgets to update the SQL; the dev env then doesn't
  match the schema. Mitigation: a future CI check (`drizzle-kit check`)
  that fails if `schema.ts` and `drizzle/*.sql` are out of sync.

## Alternatives considered

**Push-based (`drizzle-kit push`):** rejected for prod. Acceptable for
local prototyping but skips the SQL-review step.

**Hand-written SQL migrations:** rejected. Schema-as-code is the
ergonomic point of Drizzle; hand-rolling defeats it.

**`prisma migrate`:** rejected. We've already committed to Drizzle.

## Follow-up tracker

A CI/deploy step that runs `drizzle-kit migrate` against the target
environment, plus a `drizzle-kit check` PR-blocker. To be filed as a
separate story when the first migration after this initial one lands —
the cost of automation is justified once schema churn is real.
