# cycle-2 — design-system-primitives

**Status:** complete
**Covers:** AC-1 (DS foundation), AC-6 (a11y by default)
**Parent SHA:** `1a9be87`

## RED → GREEN → REFACTOR

### RED
Three new test files asserting:

- `components/ds/__tests__/Button.test.tsx` — accessible button role,
  fires onPress when enabled, disabled state suppresses onPress + flips
  `accessibilityState.disabled`, loading flips `busy: true`, primary
  background resolves from the active palette.
- `components/ds/__tests__/Field.test.tsx` — label is the
  `accessibilityLabel`, error text is rendered AND mirrored in
  `accessibilityState.invalid`, `onChangeText` fires, `keyboardType` +
  `autoCapitalize` forwarded.
- `components/ds/__tests__/Text.test.tsx` — body color from the active
  palette, title variant applies the 28/700 type scale, title variant
  auto-promotes to `accessibilityRole="header"`.

All three suites failed before the primitives existed (`Cannot find
module '../Button'` etc.).

### GREEN
- `lib/theme-provider.tsx` — `ThemeProvider` + `useTheme()`. Honors an
  explicit `scheme` prop, otherwise falls back to `useColorScheme()`,
  otherwise defaults to dark (Slabd's brand default).
- `components/ds/Text.tsx` — variant-aware (`title | body | caption`),
  muted color toggle, auto `accessibilityRole="header"` for `title`.
- `components/ds/View.tsx` — surface tokens (`bg | surface |
  surfaceMuted | transparent`) + token-aware padding shorthand.
- `components/ds/Button.tsx` — Pressable wrapper, three variants
  (`primary | secondary | danger`), pressed-state palette swap, disabled
  + loading both reach into `accessibilityState`, 44pt min height for
  iOS HIG touch targets.
- `components/ds/Field.tsx` — `TextInput` with a label-paired
  `accessibilityLabel`, error text + `accessibilityState.invalid`, hint
  fallback when not invalid, danger-border on invalid.
- `components/ds/index.ts` — barrel with all component + type exports.
- `app/_layout.tsx` — wraps the Stack in `ThemeProvider`.
- `app/index.tsx` — migrated to DS `<Text variant="title">` + `<View
  surface="bg">`. Smoke test from cycle-1 still asserts the header role.

### REFACTOR
- Removed the cycle-1 home-screen hardcoded colors; everything routes
  through palette tokens now.
- Field's invalid-or-hint rendering branches once; the `accessibilityState`
  object only carries `invalid: true` when actually invalid, avoiding a
  noisy `invalid: false` for AT.
- Button uses a small `withAlpha` helper for the inert background tint
  rather than threading a second palette token.

## Verification

```
$ bun run typecheck && bun run lint && bun run test
$ tsc --noEmit
$ eslint .
$ jest
PASS components/ds/__tests__/Button.test.tsx
PASS components/ds/__tests__/Field.test.tsx
PASS components/ds/__tests__/Text.test.tsx
PASS app/__tests__/index.test.tsx

Test Suites: 4 passed, 4 total
Tests:       13 passed, 13 total
```

## Notes for next cycle

- The provider defaults to dark when no device scheme is reported — this
  is intentional for the brand but might surprise future tests that
  expect a "system follows device" baseline. If we get bug reports, add
  an opt-in `followSystem` prop.
- `Button.style` accepts a downstream override but currently I cast it
  through `as object` to keep the prop variadic; revisit if cycle-4
  needs animated style.
- Field's keyboard handling is forwarded raw — phone-pad + autoComplete
  for the OTP screens will be wired in cycle-4/5.

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-2",
  "status": "complete",
  "checkpoints_reached": ["plan_written", "red_seen", "green_seen", "refactor_done"],
  "artifacts_written": [
    "lib/theme-provider.tsx",
    "components/ds/Text.tsx",
    "components/ds/View.tsx",
    "components/ds/Button.tsx",
    "components/ds/Field.tsx",
    "components/ds/index.ts",
    "components/ds/__tests__/Button.test.tsx",
    "components/ds/__tests__/Field.test.tsx",
    "components/ds/__tests__/Text.test.tsx",
    "app/_layout.tsx",
    "app/index.tsx"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "pending-commit",
    "tests_passing": true,
    "test_command_used": "bun run typecheck && bun run lint && bun run test"
  },
  "acs_covered": ["AC-1", "AC-6"],
  "ac_test_evidence": [
    { "ac_id": "AC-1", "test_name": "AC-1: resolves primary background from the active palette" },
    { "ac_id": "AC-6", "test_name": "AC-6: exposes an accessible button role with the given label" }
  ],
  "proposed_ontology_terms": ["Design System", "Theme Provider", "Field", "Button"],
  "tokens_used": null,
  "error": null
}
```
