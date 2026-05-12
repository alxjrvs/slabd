# Cycle 1 — Hono app factory + Clerk JWT middleware

**Run:** `2026-05-11-backend-scaffold-baseline`
**Status:** complete
**ACs covered:** AC-1 (Hono on Expo Router with Clerk JWT middleware), AC-5 (middleware tests with mocked JWKS)
**Parent SHA:** `da219df100692063ad258d888c1ca53fee5f0a62`
**Branch:** `cycle-1/backend-scaffold-baseline`

---

## Envelope

```json
{
  "skill": "implement:tdd-cycle",
  "id": "cycle-1",
  "status": "complete",
  "checkpoints_reached": [
    "plan_written",
    "red_seen",
    "green_seen",
    "refactor_done",
    "local_review:passed"
  ],
  "artifacts_written": [
    "docs/implement/2026-05-11-backend-scaffold-baseline/cycles/cycle-1.md"
  ],
  "verifiable_evidence": {
    "branch_sha_claimed": "1249280",
    "tests_passing": true,
    "files_changed_claimed": [
      "package.json",
      "lib/server/app.ts",
      "lib/server/types.ts",
      "lib/server/middleware/clerk-auth.ts",
      "lib/server/__tests__/clerk-auth.test.ts",
      "docs/implement/2026-05-11-backend-scaffold-baseline/cycles/cycle-1.md"
    ],
    "test_command_used": "npx jest --ci"
  },
  "acs_covered": ["AC-1", "AC-5"],
  "ac_test_evidence": [
    {
      "ac_id": "AC-1",
      "test_name": "AC-1: clerkAuth middleware — missing Authorization header returns 401 missing_token"
    },
    {
      "ac_id": "AC-1",
      "test_name": "AC-1: clerkAuth middleware — malformed JWT returns 401 invalid_token"
    },
    {
      "ac_id": "AC-1",
      "test_name": "AC-1: clerkAuth middleware — wrong signing key returns 401 invalid_token"
    },
    {
      "ac_id": "AC-1",
      "test_name": "AC-1: clerkAuth middleware — expired token returns 401 invalid_token"
    },
    {
      "ac_id": "AC-1",
      "test_name": "AC-1: clerkAuth middleware — valid token passes through and sets context vars"
    }
  ],
  "proposed_ontology_terms": ["clerk_auth_middleware"],
  "tokens_used": { "input": 0, "output": 0 },
  "error": null
}
```

---

## Change rationale

### RED

Tests written first in `lib/server/__tests__/clerk-auth.test.ts`. They
import `clerkAuth` from a path that does not yet exist, so all 5 tests
fail with "Cannot find module".

### GREEN

Implemented three files:

1. `lib/server/types.ts` — `AppVars = { userId: string; email: string }`.
   Minimal type contract shared by middleware and handlers.

2. `lib/server/middleware/clerk-auth.ts` — `clerkAuth(opts?)` middleware
   factory. Accepts an optional `fetchJwks` override so tests can inject
   an in-memory JWKS without network calls. Production path fetches from
   Clerk's `.well-known/jwks.json` endpoint (URL derived from
   `CLERK_FRONTEND_API` env var, with fallback to derivation from
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`). JWKS cached in module scope;
   on a `kid` mismatch (key rotation), cache is invalidated and refetched
   once before treating the token as invalid. Uses `jose`'s
   `createLocalJWKSet` + `jwtVerify` for the actual verification.

3. `lib/server/app.ts` — `createApp()` factory returning a typed
   `Hono<{ Variables: AppVars }>` instance. Routes are wired in cycle-3;
   this cycle only establishes the factory and type contract.

4 of 5 tests passed on first implementation run. The fifth (valid token
path) failed because the module-level `cachedJwks` leaked between tests.
Fixed by adding `beforeEach(() => __resetJwksCacheForTests())` to the
test file and exporting the reset helper.

### REFACTOR

Extracted `verifyWithCacheAndRetry` and `tryVerify` as named helpers to
keep the middleware handler body short and the retry logic testable in
isolation. No behaviour change.

### Dependencies

- Added `hono@^4` and `@clerk/backend@^1` to `dependencies`.
- `jose@^5` placed in `dependencies` (not devDep): the production
  middleware imports `createLocalJWKSet` + `jwtVerify` from `jose`. The
  scope spec listed it as a devDep on the assumption that only tests would
  use it; that assumption does not hold since `jose` is the verification
  layer. This deviation is noted explicitly.

---

## AC evidence

| AC | Test name | Result |
|----|-----------|--------|
| AC-1 | AC-1: clerkAuth middleware — missing Authorization header returns 401 missing_token | PASS |
| AC-1 | AC-1: clerkAuth middleware — malformed JWT returns 401 invalid_token | PASS |
| AC-1 | AC-1: clerkAuth middleware — wrong signing key returns 401 invalid_token | PASS |
| AC-1 | AC-1: clerkAuth middleware — expired token returns 401 invalid_token | PASS |
| AC-1 | AC-1: clerkAuth middleware — valid token passes through and sets context vars | PASS |

Full suite: 113 tests, 20 suites — all pass.
Typecheck: clean.
Lint: clean.

---

## Out of scope (held)

- Route wiring (`app/api/[...path]+api.ts`) — cycle-3
- `/api/healthz` and `/api/me` handlers — cycle-3
- Cloudflare deploy wiring — cycle-4
- `dev:api` script + README — cycle-4
