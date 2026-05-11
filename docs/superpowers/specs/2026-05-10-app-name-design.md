# App Name Design — Slabd

**Date:** 2026-05-10
**Status:** Selected (pending TM + domain verification)
**Project:** ComicApp (working title) → **Slabd**

## Decision

The product will be named **Slabd**.

Letterboxd-style respelling of "slabbed" — collector vocabulary for a CGC/CBCS-encapsulated comic. A slab is the rigid acrylic case a professionally graded comic is sealed in, and "slabbed" is the verb form collectors use without explanation among themselves.

## Why this name

**In-group signal.** "Slabbed" is high-density collector vocabulary. A casual reader does not say it; a collector who owns ten books does. The PRD's target users (REQ-001 swipe deck, REQ-006 verified sellers, REQ-009 Stripe escrow) are precisely the audience that recognizes the term on sight. The name does the segmentation work the marketing site otherwise has to.

**Object / preservation lane.** Earlier candidates (Spinner, Pull) cued *motion* or *interface*, which fights the product — the swipe is how you use it, not what it is. The Mylar-adjacent lane (material, preservation, the comic-as-object) sat closer to the brand. Slab is the modern terminus of that lineage:

- **1980s–1990s:** Mylar sleeves became the collector standard for preservation.
- **2000–today:** CGC encapsulation ("slabbing") became the standard for high-value books.

Naming the app after the case that protects the high-value object aligns with the marketplace's verified-seller / authenticated-grading positioning.

**Premium positioning.** Slabbed books are graded books are expensive books. The name presupposes the upper end of the market the platform is structurally built for, without claiming it explicitly.

**Trademark distinctiveness via spelling.** "Slab" alone has prior art: **Slab Inc.**, a knowledge-management SaaS, held the mark in software classes before being acquired by GitLab in 2023. The Letterboxd-style "-d" drop (`slabbed` → `Slabd`) is a recognized distinctiveness pattern (Letterboxd, Flickr, Tumblr) — distinctive enough to file in IC 9 / IC 35 / IC 42 without colliding head-on with the Slab Inc. residue.

## Candidates considered and eliminated

| Candidate | Reason eliminated |
|-----------|-------------------|
| An Infinite Longbox | Too long; not brandable as a product name (works as a tagline). |
| Pull | "Pull list" is in-term, but Pull is a hard trademark — generic English verb, heavy prior art across e-commerce. |
| Longbox | Taken. |
| Spinner | Cues rotation / motion; the interface is swipe, not spin. Misleading affordance. |
| Pedigree | `pedigreecomics.com` (Doug Schmell) is a live high-grade Silver/Golden Age dealership — direct prior art in the exact market. |
| Origins | Estée Lauder holds Origins across multiple classes. |
| Mylar | DuPont / Tekra hold "Mylar" as a registered material trademark; licensing-heavy. |
| Floppy | Authentic collector term ("a floppy" = a single monthly issue), but reads downmarket and cues low-value books — opposite of the platform's premium-trust positioning. |
| Slab (bare) | Slab Inc. SaaS prior art (now under GitLab); risk in software class. |

## Brand extensibility

- **Verb form:** "I slabd it" reads naturally (collector already says "I slabbed it"). Supports the swipe-action verb the product needs ("save", "claim", "snag").
- **Logotype direction:** The terminal "-d" gives a clean wordmark — short, four characters of legible weight, easy to render as an app icon glyph (single letter S in a slab outline reads instantly).
- **Tagline space:** "Every book, slabd." / "The slab is the shelf." / "Built for slabbed books." — name supports declarative copy without straining.
- **Sub-brand space:** Slabd Verified (grading layer), Slabd Vault (storage / authenticated holding), Slabd Decks (curated lists). All read on-brand.

## Outstanding verifications

Before committing the name to PRD §1.0, run these checks:

- [ ] **USPTO TESS pull** on `Slab` and `Slabd` in IC 9 (mobile apps), IC 35 (online marketplace services), IC 42 (SaaS). Confirm no live registrations that would block.
- [ ] **Domain availability** — `slabd.com`, `slabd.app`, `slabd.io`. Decide which is anchor and which are defensive.
- [ ] **Social handle availability** — `@slabd` on Instagram, X, TikTok (the three places comic collectors talk).
- [ ] **App Store name search** — confirm no existing iOS / Google Play app named Slabd.
- [ ] **Common-law pull** — Google `"slabd"` and `"slabd comics"` for unregistered prior use that would still create confusion risk.

If TESS or App Store turns up a blocker, the fallback is **Slabbd** (double-b retains pronunciation and gets further from Slab Inc.).

## Downstream changes required

When the name is confirmed (after the verifications above):

1. **PRD §1.0** — replace "An Infinite Longbox" with **Slabd** as product name; keep "An Infinite Longbox" as a legacy / tagline reference if useful.
2. **architecture.md** + **architecture-audit.md** — search/replace product-name references.
3. **Project memory** at `/Users/jarvis/.claude/projects/-Users-jarvis-Code-ComicApp/memory/project_comicapp.md` — update product name field.
4. **README / package.json** — once the repo is scaffolded under `/ignite:kickoff`, the package name and root README adopt `slabd`.

## Open question for user

The name is selected pragmatically — verifications are deferrable to anytime before public launch. Two paths from here:

- **Path A (commit now):** Treat Slabd as final; update PRD / architecture / memory now. TM filing and domain registration are tracked as separate follow-up tasks but don't block the next pipeline step (`/ignite:kickoff`).
- **Path B (verify first):** Run TESS pull + domain checks before any project rename. Lower risk of having to rename mid-build.

Path A is the default unless the user signals otherwise.
