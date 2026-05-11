# Brand Language — Sleeve

**Date:** 2026-05-10 (decisions) / 2026-05-11 (spec written) / 2026-05-11 (renamed Slabd → Sleeve per issue #40)
**Status:** Approved (visual companion iteration complete)
**Project:** Sleeve — marketplace for comics (renamed from "Slabd"; earlier working titles "ComicApp" / "An Infinite Longbox")

> **Scope correction baked in:** Sleeve is a marketplace for *comics* — graded and raw, modern and back-issue. The bag-and-board "sleeve" is the brand name's collector-protective root; it is not a product constraint. Letterboxd isn't about boxes.

## Brand pillars

- **Professional, modern, trustable.**
- **Clean UI that's easy for older sellers.** Higher base type sizes (17px body floor), generous line-height, high-contrast color, no trendy micro-UI.
- **Comics-coded without being childish.** Vocabulary, references, and visual cues belong to collectors — not to cartoon-superhero aesthetics.

## Brand direction

**Vintage Modernized** — refined newsprint sensibility executed with contemporary typographic discipline. Reference set:

- Criterion Channel (catalog density + editorial restraint)
- Letterboxd (in-group vocabulary as core brand asset)
- Heritage Auctions (premium / authenticated voice)
- Mondo posters (illustration heritage applied with restraint)

The direction sits between "comic shop" and "auction house" — closer to the auction house, but with enough comic-shop DNA that collectors recognize themselves in it.

## Typography

| Role | Font (free / Google) | Pro upgrade path | Use |
|------|----------------------|------------------|-----|
| **Display** | Oswald | Knockout / Druk Condensed | Headlines, wordmark, page titles, marketing |
| **Body** | IBM Plex Sans | Söhne / Plex itself is excellent | UI body, descriptions, long-form copy |
| **Mono** | IBM Plex Mono | Plex Mono itself | Metadata (issue #, dates, grade codes, prices in tabular contexts) |

**Why this set:** Oswald is the narrow newsprint-headline DNA without buying Knockout. IBM Plex Sans is one of the best readability-first system sans available — IBM commissioned it to be both warm and precise. Plex Mono carries the "comic-shop database / library catalog" coding the second-place brand direction (B · Catalog Index palette) wants.

### Type scale (UI baseline)

| Element | Size | Weight | Family |
|---------|------|--------|--------|
| Body | 17px | 400 | Plex Sans |
| Body small | 15px | 400 | Plex Sans |
| Metadata / labels | 11px tracked 0.16em | 700 uppercase | Plex Mono |
| H3 / card title | 22px | 600 | Oswald |
| H2 / section | 32px | 600 | Oswald |
| H1 / page | 44px | 600 | Oswald |
| Display / marketing | 64–96px | 600 | Oswald |

**Older-seller readability rules:**
- 17px body floor (never drop below in primary content)
- Line-height 1.5–1.55 for body
- Letter-spacing 0 for body Plex Sans; 0.14–0.22em tracking for Plex Mono labels (per character it makes Mono readable, not cramped)
- All-caps only in Oswald or Plex Mono (never Plex Sans)
- Maximum line length 65 characters

## Color palette — Catalog Index

| Token | Hex | Role |
|-------|-----|------|
| `paper.ui` | `#F7F4ED` | Primary UI background (warm-white). The canonical "paper" surface in the app. |
| `paper.printed` | `#ECDFB8` | "Printed page" cream. App icon background, marketing surfaces meant to feel printed, hero panels. Added during wordmark iteration. |
| `ink` | `#0F1B2D` | Deep-ink near-black. Body text, primary type, icon strokes, header bars. |
| `accent.vermilion` | `#C1432F` | Primary accent. CTAs, "featured" badges, alerts, brand stamps. Use sparingly. |
| `accent.gold` | `#D9C77A` | Muted gold. Secondary accent, verified-seller signal, premium badges. |
| `stone` | `#7A7368` | Stone-gray neutral. Secondary text, dividers, disabled states. |

**Accessibility floor:** every token pair used for text passes WCAG AA at 17px. `ink` on `paper.ui` is the canonical body pairing (contrast ratio ≈ 13.6:1). `vermilion` on `paper.ui` passes AA for large text and UI elements but should not be used as a default body color.

**Dark-mode policy:** there is no canonical dark mode at launch. If a dark surface is needed, default to `ink` ground with `paper.ui` text and `accent.gold` as the highlight. Seller dashboards stay light-mode by default (older-seller eye fatigue is a real concern, and dark UIs are harder to scan under bright shop lighting).

## Wordmark

**Pure Type direction.** "SLEEVE" set in Oswald, all caps, no enclosure, no graphic mark adjacent. Kerning and lockup rules from the prior "SLABD" wordmark carry over unchanged — only the letterforms change.

```
SLEEVE
```

- Default color: `ink` on `paper.ui`
- Minimum size: 14px cap-height (below that, switch to the app icon)
- Clear space: 1× cap-height on all sides
- Always paired with the meta-tagline below at a smaller size: `— Marketplace for Comics —` in Plex Mono, tracked 0.22em, opacity 0.5

The wordmark intentionally carries no graphic mark. The personality lives in the app icon (below) and the type discipline. When the wordmark and the app icon appear in the same lockup, the icon sits to the left at 1.25× the cap-height of the wordmark.

## App icon — CCA seal parody

The icon is a parody of the **Comics Code Authority seal** (1954–2011), the most recognizable mark ever printed on a comic cover. Pure in-group iconography.

### Construction (100×100 viewbox)

| Layer | Spec |
|-------|------|
| Icon container (rounded square) | Fill `paper.printed` `#ECDFB8`. Padding 10% inside the rounded square. Corner radius scaled to platform (iOS: 22.37% per Apple guidelines). |
| Outer ring | `cx=50 cy=50 r=48`, fill `paper.ui` white `#FFFFFF`, stroke `ink` 1.8 width. |
| Inner ring | `cx=50 cy=50 r=38`, no fill, stroke `ink` 0.8 width. |
| Rim text path | Circular path at `r=41`. Cap-height of fs=6 text visually centers at r≈43 — equidistant between the two rings. Path circumference = 2π·41 ≈ 257.6 units. |
| Rim text | "APPROVED ★ BY ★ THE ★ SLEEVE ★ COMICS ★ APP ★ " (with one trailing space) — Arial Black / Impact / Knockout HTF31 Junior Heavyweight, font-size 6, fill `ink`. Set with `textLength="257.6"` and `lengthAdjust="spacingAndGlyphs"` so the string stretches exactly around the path; the trailing space provides the gap at the seam (where the loop wraps back to "APPROVED"), keeping that gap identical to every other word–star spacing. `textLength="257.6"` is unchanged after the SLABD→SLEEVE rename: the string is one character longer, so `spacingAndGlyphs` redistributes the marginal width across all glyphs (≈0.2% tighter per character). Seam-cleanliness verified at 40 / 60 / 80 / 128 / marketing px — no visible change at any locked size. |
| Halftone background field (seal interior) | Sparse ben-day screen filling the entire seal interior (clipped at r=37.6 so it sits just inside the inner ring). Pattern: white ground, 0.42-radius `ink` dots on a 3.4×3.4 grid, `patternTransform="rotate(15)"`. This is the "page is printed" texture that the S bleeds into. |
| Halftone S fill | Dense ben-day screen: `ink` ground with 0.7-radius white knockouts on a 2.6×2.6 grid, same 15° rotation as the background. The S is rendered with this pattern as `fill` and no stroke, so the dot grid itself defines the edge. |
| Center letter | Capital "S" in Oswald (or Arial Narrow fallback), font-weight 900, font-size 90, fill = dense halftone pattern, text-anchor middle, letter-spacing −1, vertical position y=82 (alphabetic baseline; cap-height visual center lands at y=50, the seal's geometric center). No outline stroke — the rasterized dot edge IS the edge. |

### Why this composition works

- The CCA silhouette is recognizable at thumbnail sizes (40px) even when the rim text becomes pure texture; the center S carries the recognition.
- The white-seal-on-cream-page construction reads as "stamped onto a printed cover" — the original CCA aesthetic.
- The rim copy reframes the seal: not "approved by the Comics Code Authority" (gatekeeping), but "approved by the Sleeve Comics App" (community-curated). The reference is intact; the meaning is updated.
- The S is filled with a rotated ben-day halftone screen and bleeds into a sparser dot field across the seal interior — pure mid-century comic-press iconography. At marketing scale the screen reads loud; at thumbnail sizes the dots collapse into nearly-solid ink, preserving legibility. The S is screened, but it's still the first thing you see.
- Reads correctly at 40px, 60px, 80px, 128px, and marketing scale. Verified during iteration.

### Variations

| Variant | Use |
|---------|-----|
| **Primary** | Cream container + white seal + ink ring/text. Default app icon, OS Home-screen, App Store, marketing. |
| **Inverted** (future) | Ink container + cream seal + cream ring/text. Dark backgrounds, social profile rings, watermarks. |
| **Single-color** (future) | All `ink` on `paper`, no rim text, just the rings + S. Tiny favicons, print monochrome, embroidery, merch. |

Inverted and single-color variants are deferred — primary is enough to ship.

## Voice / copy direction

- **Insider register, not jargon.** Use "raw" and "slabbed," "pull," "longbox," "key issue" naturally — never define them. Collectors don't need them defined; non-collectors learning the vocabulary is a feature, not a bug.
- **Specific over general.** "9.8 white pages, off-white cover spine, minor color rub bottom-right" beats "great condition." The PRD's verified-seller tier demands description precision.
- **Plex Mono for metadata.** Anywhere a value reads as a database field (issue number, year, grade, certification number, price) — use Plex Mono. Anywhere narrative — use Plex Sans.
- **No exclamation marks in product copy.** The brand is confident; it doesn't yell. (Exception: editorial "★ FEATURED" pills — single asterisk star, not exclamation.)

## What this brand language is **not**

Explicit anti-patterns to avoid:

- **Not childish.** No cartoon Spider-Man, no "POW! BAM!" sound effects, no halftone-style brand illustration that reads cartoon-Marvel.
- **Not fintech.** No gradient meshes, no blue/purple SaaS palette, no Inter-and-shadcn default look. Sleeve is paper, not pixels.
- **Not "vintage" as kitsch.** No fake-aged textures, no torn-paper edges, no faux-watermark grunge. The newsprint texture is a single-layer halftone-dot pattern used sparingly, not a grunge effect.
- **Not graded-only.** The CCA seal is the *visual* metaphor for trust; the *product* serves the whole comics market.

## Downstream changes

When this spec is approved, the following references update to "Sleeve":

1. `ideate/PRD.md` §1.0, §2.0, §3.0 — product name throughout.
2. `ideate/architecture.md` and `ideate/architecture-audit.md` — product name + the Expo SDK 55 references already updated previously.
3. Project memory `/Users/jarvis/.claude/projects/-Users-jarvis-Code-slabd/memory/project_sleeve.md` (legacy `-Users-jarvis-Code-ComicApp/memory/project_comicapp.md` preserved as historical record).
4. Repo metadata (when `/ignite:kickoff` scaffolds): `package.json` name, root README, Expo app config.

## Outstanding verifications (re-issued for Sleeve)

The Slabd-era verifications below are superseded by the SLABD → SLEEVE rename (issue #40). The Sleeve verifications are external admin work and remain deferred per the issue's own out-of-scope section.

- [ ] USPTO TESS pull on `Sleeve` in IC 9 / 35 / 42.
- [ ] Domain availability — `sleeve.com`, `sleeve.app`, `sleeve.io`, `sleeve.co` (and fallbacks).
- [ ] Social handle availability — `@sleeve` on Instagram, X, TikTok.
- [ ] App Store name search — confirm no existing iOS / Google Play app named Sleeve.
- [ ] Common-law pull — Google `"sleeve"` and `"sleeve comics"` for unregistered prior use.

Fallback if blocked: **Sleeved** (past-tense form retains the bag-and-board metaphor; further from "sleeve" as a generic dictionary word).

## Iteration history

Captured for posterity from the visual companion brainstorm session.

| Round | Decision | Locked |
|-------|----------|--------|
| 1 | Brand direction: A (Editorial Trust) / B (Curated Marketplace) / C (Vintage Modernized) | **C** |
| 2 | Type pairing: A (Anton+Inter) / B (Oswald+Plex) / C (Bebas+Manrope) | **B** |
| 3 | Palette: A (Newsprint Classic) / B (Catalog Index) / C (Pulp Noir) | **B** |
| 4 | Wordmark: A (Pure Type) / B (Slab Bracket) / C (Stamp Seal) | Pivoted — user requested CCA stamp icon |
| 5 | App icon: A (Faithful CCA) / B (Modernized Seal) / C (Stamped Impression) | **A** |
| 6 | Rim text positioning fix | Path moved to r=41 to equidistant in band |
| 7 | Seal interior treatment | White seal on cream "printed page" |
| 8 | Cream depth | Bumped from `#F7F4ED` to `#ECDFB8` for printed contexts |
| 9 | Rim text wording | "Marketplace" → "App" (shorter; more breathing room in the band) |
| 10 | Rim text fit | Switched to `textLength`/`lengthAdjust=spacingAndGlyphs` for exact-fit seam |
| 11 | Center S size | Scaled from font-size 44 → 90; cap-height fills the inner circle |
| 12 | Center S treatment | Rasterized via ben-day halftone — dense screen on the S, sparse screen bleeding into the seal interior, 15° rotation, no outline |
| 13 | Center S centering | Switched from `dominant-baseline="middle"` (centers on x-height) to explicit baseline math (y=82) for true cap-height centering at the seal's geometric middle |
