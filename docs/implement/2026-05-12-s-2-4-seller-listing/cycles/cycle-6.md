# Cycle 6 — Mobile Sell Flow (S-2.4 #7)

## Scope

Add the four-step seller flow under `app/(app)/sell/` (Expo Router segment):
start → attributes → photos → review → publish.

## Files Created / Modified

- `app/(app)/sell/_layout.tsx` (A) — Stack layout with `title: "Sell"`.
- `app/(app)/sell/index.tsx` (A) — start screen; POSTs `/api/listings/draft`
  on mount, holds the returned id, "Continue" navigates to attributes.
- `app/(app)/sell/attributes.tsx` (A) — form (series, issue, gradeCompany,
  gradeNumeric, price-dollars-to-cents, conditionNotes); "Save & Continue"
  PATCHes the draft then routes to photos.
- `app/(app)/sell/photos.tsx` (A) — photo picker UI (mocked file selection);
  enforces a ≥2-photo gate before enabling Continue.
- `app/(app)/sell/review.tsx` (A) — GETs the draft, renders summary card;
  "Publish" POSTs `/:id/publish`; 200 → `router.replace("/")`; 422 → inline
  error from the response body.
- `app/(app)/index.tsx` (M) — adds the "Sell a comic" entry button to the
  home screen.
- `app/__tests__/sell/sell-start.test.tsx` (A) — AC-1 coverage.
- `app/__tests__/sell/sell-attributes.test.tsx` (A) — AC-1 coverage.
- `app/__tests__/sell/sell-review.test.tsx` (A) — AC-2 + AC-3 coverage.

## Design Choices

### Draft id flows through router query params

The id from `POST /api/listings/draft` is appended to each subsequent screen
URL (`/sell/attributes?id=<id>`, `/sell/photos?id=<id>`, `/sell/review?id=<id>`).
This makes the deep-link-safe by default — users can resume mid-flow if the
client restarts.

### Continue gate on the start screen

The "Continue" button is disabled while draft creation is in flight AND while
no draft id is present. Test asserts both states.

### Photo-count gate is client-only (intentional)

The ≥2-photo invariant lives on the publish endpoint (cycle-3) as a 422
validation. The UI enforces it as a UX nicety. The review screen surfaces
the 422 message inline if the gate is bypassed.

## Coverage Notes

- 11 component tests across three suites.
- All `it()` names lead with the AC tag for grep-able verification.
