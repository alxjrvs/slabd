# ADR-0003: SigV4 Presigner Choice in Cloudflare Workers

- **Status**: Proposed

- **Context**: Generating an AWS-SigV4 presigned URL for R2 requires HMAC-SHA256. Cloudflare R2 exposes an S3-compatible API, so standard AWS tooling applies — but the full `@aws-sdk/s3-request-presigner` is incompatible with the Workers runtime (missing Node.js built-ins, large bundle). A Workers-native approach is required.

- **Decision**: Use **`aws4fetch`** — a Workers-native SigV4 implementation built on `crypto.subtle`. It has no Node.js dependencies and bundles to ~3 KB.

  The presigner lives at `lib/server/r2/presign.ts` and exports:

  ```ts
  export async function presignR2Put(params: {
    key: string;
    contentType: string;
    ttlSeconds: number;
    env: {
      CF_ACCOUNT_ID: string;
      CF_R2_ACCESS_KEY_ID: string;
      CF_R2_SECRET_ACCESS_KEY: string;
      CF_R2_BUCKET: string;
    };
  }): Promise<{ uploadUrl: string; expiresAt: number }>
  ```

  The R2 S3-compatible endpoint is `https://<CF_ACCOUNT_ID>.r2.cloudflarestorage.com`. Content-Type pinning and `x-amz-content-length-range` are set as described in ADR-0001.

  In unit tests, `presignR2Put` is injected via `ListingsImagesUploadUrlDeps`; the real implementation is never called in tests.

  **Implementation note for cycle-2**: verify that `aws4fetch` supports `x-amz-content-length-range` as a presign condition before committing. If unsupported, fall back to a ~80-line hand-rolled SigV4 presigner using `crypto.subtle.importKey` + `crypto.subtle.sign` — the algorithm is standard and well-documented. The `nodejs_compat` flag already set in `wrangler.toml` covers any minor shim needs.

- **Consequences**:
  - Small bundle, Workers-native, no polyfills.
  - `crypto.subtle` HMAC-SHA256 returns a Promise but resolves in microseconds in Workers — no latency concern.
  - If `aws4fetch` presign API doesn't expose `content-length-range`, the hand-rolled fallback adds ~80 lines of owned code but zero additional dependencies.

- **Alternatives considered**:
  - `@aws-sdk/s3-request-presigner`: requires Node.js `crypto`; large bundle; not Workers-compatible without heavy polyfilling. Ruled out.
  - Hand-rolled SigV4 from scratch: viable and zero-dep; slightly more maintenance surface than `aws4fetch`. Preferred fallback if `aws4fetch` gaps surface.
  - Cloudflare R2 Workers binding (`env.R2.put()`): executes the PUT server-side — no presigned URL produced; incompatible with direct-to-R2 upload model.
