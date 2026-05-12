# ADR-0005: Variant URL Construction

- **Status**: Proposed

- **Context**: `GET /api/listings/:id/images` must return a `variants` object with `card`, `thumb`, and `detail` keys pointing to Cloudflare Images URLs. This logic should be testable in isolation and reusable by any future handler or serializer that exposes image records.

- **Decision**: A pure helper at `lib/server/images/variant-url.ts`:

  ```ts
  type Variant = "card" | "thumb" | "detail";

  export function buildVariantUrl(
    key: string,
    variant: Variant,
    accountHash: string,
  ): string {
    return `https://imagedelivery.net/${accountHash}/${key}/${variant}`;
  }

  export function buildVariants(
    key: string,
    accountHash: string,
  ): Record<Variant, string> {
    return {
      card:   buildVariantUrl(key, "card",   accountHash),
      thumb:  buildVariantUrl(key, "thumb",  accountHash),
      detail: buildVariantUrl(key, "detail", accountHash),
    };
  }
  ```

  `accountHash` (`CF_IMAGES_ACCOUNT_HASH`) is injected from env via the list handler's `deps` bag — consistent with how all handlers receive env-sourced config in this codebase. The functions are pure (no env access), making them trivially unit-testable.

  **Why these three variants**:
  - `card`: grid/search thumbnail (~300×300), the most frequent render context.
  - `thumb`: gallery strip or notification badge (~80×80).
  - `detail`: full listing detail view (~1200 px wide).

  These cover the three rendering contexts in REQ-004 and REQ-032. Variant names are opaque strings that must match names registered in the Cloudflare Images dashboard.

  **Adding a new variant**: add the key to the union type and `buildVariants`, register the variant in the Cloudflare Images dashboard. No DB migration or schema change required.

- **Consequences**:
  - Pure functions — zero mocking overhead in tests.
  - Single place to update if the CF Images base URL or URL scheme changes.
  - Variant names are stringly-typed; a typo produces a 404 from CF Images at delivery time. A `KNOWN_VARIANTS` constant or Zod enum can be added as a hardening pass.

- **Alternatives considered**:
  - Inline URL construction in the route handler: not reusable; harder to unit-test. Ruled out.
  - Storing variant URLs in the DB on confirm: premature — variant set may expand without requiring re-upload. Ruled out.
  - Class-based `VariantUrlBuilder`: overkill for two pure functions. Ruled out.
