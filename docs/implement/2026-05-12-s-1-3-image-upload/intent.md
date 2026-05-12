---
run_id: 2026-05-12-s-1-3-image-upload
issue: 4
phase: phase_define
schema_version: 1
source:
  kind: issue
  ref: "#4"
---

# Intent — Image upload pipeline (S-1.3)

Land the backend upload pipeline for **S-1.3**: signed-URL issuance for
direct-to-R2 uploads, server-side confirmation + ordering persistence,
Cloudflare Images variant URL delivery, and all supporting env/migration
plumbing. Mobile picker UI integration is explicitly out of scope and
ships in a follow-up client story.

## Acceptance Criteria

- **AC-1 — Signed upload URL issuance.**
  `POST /api/listings/:id/images/upload-url` is Clerk-gated and
  ownership-gated (the authenticated user must own the listing).
  It returns `{ uploadUrl, key, expiresAt }` where `uploadUrl` is an
  AWS-SigV4 presigned R2 PUT URL, TTL ≤ 5 minutes, with `Content-Type`
  pinned to the declared MIME type. Returns `403` when ownership check
  fails and `400` when the listing already has 8 images, when the
  request body is malformed, or when the declared MIME type is not in
  the allowlist (`image/jpeg`, `image/png`, `image/webp`, `image/heic`).
  Returns `500 { error: "internal_error" }` when required R2 env vars
  are absent (config guard).

  **Size cap deferral note.** A 10 MB per-object cap is desirable but
  is NOT enforced server-side at presign time: SigV4 query-string PUT
  signing cannot bind `x-amz-content-length-range` (POST-policy only),
  and a confirm-time HEAD-on-R2 round-trip is bypassable by retrying
  confirm with a different key. The mobile picker story (out of scope
  here) enforces the cap client-side. A future story may revisit
  switching presign to a POST policy if server-side enforcement becomes
  a hard requirement.

- **AC-2 — Upload confirmation and image record creation.**
  `POST /api/listings/:id/images/confirm` is Clerk-gated and
  ownership-gated. It accepts `{ key, position, isPrimary }` and inserts
  a row into the `images` table with `listing_id`, `r2_key`, `position`,
  and `is_primary`. Enforces the max-8-images cap server-side, returning
  `400 { error: "image_limit_exceeded" }` when the cap is hit. When
  `isPrimary` is true, the previous primary image (if any) is demoted
  atomically. Returns the created image record.

- **AC-3 — EXIF strip via Cloudflare Images.**
  Delivered image URLs are constructed as Cloudflare Images variant URLs
  (`https://imagedelivery.net/<CF_IMAGES_ACCOUNT_HASH>/<key>/<variant>`)
  rather than direct R2 URLs. Cloudflare Images strips EXIF metadata
  during variant rendering, so no sensitive metadata (GPS, device info)
  is reachable through any delivered URL. The route serving confirmed
  images never returns a direct R2 presigned GET URL.

- **AC-4 — Ordered image list with variant URLs.**
  `GET /api/listings/:id/images` returns an array of image records
  ordered by `position` ascending, with the primary image first when
  `is_primary` is set. Each record includes `id`, `position`,
  `is_primary`, and a `variants` object with keys `card`, `thumb`, and
  `detail` pointing to the corresponding Cloudflare Images variant URLs.
  The endpoint is public (no Clerk gate) to support unauthenticated
  listing views.

- **AC-5 — Env vars, DB migration, and test coverage.**
  New env vars `CF_ACCOUNT_ID`, `CF_R2_ACCESS_KEY_ID`,
  `CF_R2_SECRET_ACCESS_KEY`, `CF_R2_BUCKET`, `CF_IMAGES_ACCOUNT_HASH`
  are declared in `.env.example`, `wrangler.toml` (as `[vars]` stubs),
  and the CI soft-warn step in `.github/workflows/ci.yml` (mirrors the
  pattern from S-1.2). A Drizzle migration adds an `images` table with
  columns `id`, `listing_id` (FK), `r2_key`, `position`, `is_primary`,
  `created_at`. Unit/integration tests cover: signed URL issuance
  (ownership gate, 8-image cap), confirm (insert, primary swap, cap),
  and list (ordering, variant URL shape). `bun run typecheck && bun run
  lint && bun run test:ci` is green.

## Out of scope

- Mobile image picker UI and client-side EXIF reading.
- Wi-Fi p95 upload latency target (≤3 s for 5 MB) — an
  infrastructure/architecture constraint, not a code-level AC.
- Image deletion endpoint (separate story).
- Buyer-visible image rendering in listing browse/search (separate story).
- Video or non-image asset types.
- Per-listing storage quotas beyond the 8-image count cap.
- CDN cache invalidation on image delete/replace.

## REQ coverage

REQ-004 (image-first listings — images are a first-class listing
attribute), REQ-021 (mobile upload UX — backend half only), REQ-032
(Cloudflare Images transform pipeline).

## Proposed ontology terms

- `listing_image` — row in the `images` table associating an R2 object
  key with a listing; carries `position` and `is_primary` flags.
- `signed_upload_url` — short-lived (≤5 min) R2 presigned PUT URL
  returned by `POST /api/listings/:id/images/upload-url`; client uploads
  the binary directly to R2 without routing through the app server.
- `cf_images_variant` — a Cloudflare Images named transform (e.g.
  `card`, `thumb`, `detail`) that resizes, re-encodes, and strips EXIF
  metadata from the stored R2 source object.
- `image_confirm` — the client callback step after a successful R2 PUT
  that creates the `listing_image` record server-side and makes the image
  visible via the API.
- `primary_image` — the designated lead image for a listing; always
  returned first in the ordered image list and used as the hero asset in
  card/search views.
