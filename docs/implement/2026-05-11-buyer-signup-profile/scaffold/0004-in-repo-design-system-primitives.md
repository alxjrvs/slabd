# ADR 0004 — Design system primitives live in `components/ds/`, not a separate package

**Status:** Accepted (2026-05-11)
**Run:** `2026-05-11-buyer-signup-profile`
**Context cycle:** cycle-2

## Context

AC-6 requires accessible primitives across web and native. AC-1 implies a
predictable build. The architecture mentions a design system; the v1 scope
does not require it to be a shared package consumable by other repos.

## Decision

The design system lives at `components/ds/` inside the Expo app. It exports
themed, accessible primitives:

- `Text` — typographic scale (`title`, `body`, `caption`), themed color
- `Button` — pressable target with semantics, disabled state, loading
  spinner, mandatory `accessibilityLabel`
- `Field` — label + input + error message, links them for screen readers
- `View` (Surface) — themed background container

Theme tokens live in `lib/theme.ts` and are exposed via
`lib/theme-provider.tsx`. Tokens are chosen to clear WCAG AA contrast in
both light and dark themes.

## Consequences

- (+) Zero packaging overhead; primitives ship as part of the app bundle.
- (+) Tests run via the same `bun run test` as everything else.
- (+) Native vs web parity comes from React Native's renderer plus
  platform-specific files (`*.native.tsx` / `*.web.tsx`) when needed.
- (−) Future repos that want these primitives will need an extraction
  pass; tracked as a follow-up after the first external consumer appears.

## Alternatives considered

- **`packages/design-system` as a workspace** — premature (see ADR 0001).
- **External `tamagui` / `dripsy`** — adds a non-trivial dependency for
  needs the architecture didn't specify. Revisit if scale + perf
  considerations come up.
