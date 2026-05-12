# ADR-0002: EXIF Strip via Cloudflare Images Variant Pipeline

- **Status**: Proposed

- **Context**: Mobile photos embed GPS coordinates, device model, and lens metadata in EXIF. Any delivered URL that returns the raw R2 object exposes this data. AC-3 requires EXIF to be inaccessible via any URL the API returns. The question is where stripping happens.

- **Decision**: EXIF stripping is **delegated to Cloudflare Images** as a zero-cost side effect of variant rendering. All URLs returned by `GET /api/listings/:id/images` are Cloudflare Images variant URLs (`https://imagedelivery.net/<CF_IMAGES_ACCOUNT_HASH>/<key>/<variant>`). Cloudflare Images strips EXIF metadata automatically when serving any named variant. The list handler never constructs or returns a direct R2 presigned GET URL.

- **Consequences**:
  - Zero server-side image processing code; no `sharp`, `libvips`, or similar native modules required (which would break Workers compatibility).
  - Cloudflare Images variants are edge-cached; delivery is EXIF-free by construction on every cache hit.
  - The original R2 object retains EXIF. This is acceptable because: (a) the R2 bucket is private with no public-access policy, and (b) the API never issues GET presigned URLs for the raw object. A future hardening pass could strip the original on confirm if the risk model changes.
  - Cold-variant cache miss (first delivery of a newly uploaded image) incurs Cloudflare Images transformation latency (~100-300 ms). Acceptable for marketplace listing pages at current scale.
  - Cloudflare Images must be configured to use the R2 bucket as a source — dashboard step, not code.

- **Alternatives considered**:
  - Server-side strip on `POST /confirm` via `sharp`: Workers-incompatible native module; ruled out.
  - Client-side strip before upload: trust boundary is on the client; cannot be enforced server-side; ruled out.
  - Async strip job after confirm (race window): adds queue complexity and a window where EXIF is temporarily accessible via raw R2; ruled out.
