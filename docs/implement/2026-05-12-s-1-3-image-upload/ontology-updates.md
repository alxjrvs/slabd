# Ontology updates — s-1-3-image-upload

Proposed during `implement:define`. Merged into `docs/glossary/` at ship.

## New terms

- **`listing_image`** — Row in the `images` table associating an R2
  object key with a listing. Carries `position` (display order),
  `is_primary` (hero flag), `r2_key`, and `listing_id` FK. The
  canonical server-side representation of an uploaded image before
  or after Cloudflare Images variant generation.

- **`signed_upload_url`** — Short-lived (≤5 min) AWS-SigV4 presigned
  R2 PUT URL returned by `POST /api/listings/:id/images/upload-url`.
  The client writes the binary directly to Cloudflare R2 without
  routing through the app server. Content-type pinned; max-size
  enforced via `x-amz-content-length-range`. Analogous to
  `stripe_account_link` in S-1.2: a one-shot delegation credential
  the server issues but does not use.

- **`cf_images_variant`** — A named Cloudflare Images transform
  configuration (e.g. `card`, `thumb`, `detail`) applied to a source
  R2 object during delivery. Handles resize, re-encode, and EXIF strip
  automatically. Variant URLs follow the pattern
  `https://imagedelivery.net/<account_hash>/<key>/<variant>`.

- **`image_confirm`** — The client-side callback step after a
  successful R2 PUT. The client calls
  `POST /api/listings/:id/images/confirm` to create the
  `listing_image` row server-side and surface the image via
  `GET /api/listings/:id/images`. Without this step the R2 object
  exists but is invisible to the API.

- **`primary_image`** — The designated hero image for a listing;
  `is_primary = true` in the `images` table. Always returned first
  in the ordered image list regardless of `position`. Used as the
  card/search hero asset. Only one `listing_image` per listing may
  be primary at a time; confirm with `isPrimary: true` atomically
  demotes the previous primary.

## Refinements to existing terms

- **`listing`** (existing): gains a derived `images` relation via the
  new `images` table. The public listing GET will aggregate this
  relation; the shape lands in S-1.3.

## Status

- Pending review at ship.
