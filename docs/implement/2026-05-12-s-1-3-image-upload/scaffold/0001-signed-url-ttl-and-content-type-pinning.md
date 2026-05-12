# ADR-0001: Signed-URL TTL, Content-Type Pinning, and Size Cap

- **Status**: Proposed

- **Context**: The presigned R2 PUT URL is the upload attack surface. Without constraints on TTL, content type, and object size, a leaked or replayed URL could upload arbitrary content (executables, large files, wrong MIME type) to the bucket long after issuance. AC-1 mandates ≤5 min TTL, content-type pinning, and a 10 MB cap enforced via the presigned signature itself.

- **Decision**:
  1. **TTL = 300 s** (`X-Amz-Expires=300`). The response field `expiresAt` is `Date.now() + 300_000` (ms epoch). Clients should start the PUT immediately; the field is informational.
  2. **Content-Type pinning**: the declared MIME type is included as a signed header in the presign request (`content-type: <mimeType>`). R2 rejects any PUT where the `Content-Type` header doesn't match. This prevents a client from uploading an executable while declaring `image/jpeg`.
  3. **Size cap via `x-amz-content-length-range: 1,10485760`**: included as a signed policy condition. R2 enforces this at PUT time — no app-server involvement required on the upload leg. Minimum of 1 byte prevents zero-byte objects.
  4. **Server-assigned key** (`<listingId>/<uuid>`): returned in the response as `key`. Clients cannot choose their own R2 key paths, preventing path traversal or key collision.

- **Consequences**:
  - Constraints enforced by R2 infrastructure — no second upload pass through the app server.
  - 5-min TTL limits the abuse window for leaked URLs to an operationally negligible period.
  - Clients must send `Content-Length` on the PUT; most HTTP clients (fetch, URLSession, OkHttp) do this automatically for binary PUT bodies.
  - CORS on the R2 bucket is a Cloudflare dashboard configuration, not an app-code concern; documented in README-context.md.

- **Alternatives considered**:
  - Server-proxied upload (client → server → R2): eliminates presign complexity but adds latency and server egress; ruled out by REQ-021.
  - 30-min TTL: eases slow-network edge cases but widens the abuse window beyond acceptable; the 5-min cap is the story's explicit requirement.
  - Client-chosen key: simpler mobile code path, but enables path traversal and key collision; ruled out.
