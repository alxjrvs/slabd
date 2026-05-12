/**
 * Pure helpers for constructing Cloudflare Images variant URLs.
 *
 * These functions are injected with `accountHash` (CF_IMAGES_ACCOUNT_HASH)
 * from the handler's deps bag — they do not read env directly.
 *
 * URL shape: https://imagedelivery.net/${accountHash}/${key}/${variant}
 *
 * See ADR-0005: docs/implement/2026-05-12-s-1-3-image-upload/scaffold/0005-variant-url-construction.md
 */

export type Variant = "card" | "thumb" | "detail";

/**
 * Builds a single Cloudflare Images variant URL.
 */
export function buildVariantUrl(
  key: string,
  variant: Variant,
  accountHash: string,
): string {
  return `https://imagedelivery.net/${accountHash}/${key}/${variant}`;
}

/**
 * Builds all three variant URLs for a given R2 key and CF account hash.
 * Returns { card, thumb, detail } — all imagedelivery.net URLs, never R2 URLs.
 */
export function buildVariants(
  key: string,
  accountHash: string,
): Record<Variant, string> {
  return {
    card: buildVariantUrl(key, "card", accountHash),
    thumb: buildVariantUrl(key, "thumb", accountHash),
    detail: buildVariantUrl(key, "detail", accountHash),
  };
}
