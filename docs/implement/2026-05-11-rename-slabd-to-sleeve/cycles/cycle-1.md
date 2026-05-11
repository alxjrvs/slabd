---
phase: 2
cycle: 1
run_id: 2026-05-11-rename-slabd-to-sleeve
status: complete
parent_sha: cfbc97e84b7b5db0c863c0c0a6cf8c1b1780889b
acs_covered: [AC-1, AC-2, AC-3, AC-4]
files_changed:
  - README.md
  - ideate/PRD.md
  - ideate/architecture.md
  - ideate/prd-audit.md
  - docs/superpowers/specs/2026-05-10-brand-language-design.md
  - docs/superpowers/specs/2026-05-10-app-name-design.md
---

# Cycle 1 — Docs rename (Slabd → Sleeve)

## Scope

Five docs + one supersede header. No code touched. Memory migration is
cycle-2 (AC-5).

## Changes by file

### README.md (AC-1)

L1 `# Slabd` → `# Sleeve`. Only product-name occurrence in the file.

### ideate/PRD.md (AC-1)

Issue #40 AC-1 references "ideate/PRD.md §1.0, §2.0, §3.0 — product
name throughout", but the file never actually contained the string
"Slabd" — the PRD used the placeholder **ComicApp** that pre-dated the
brand-naming round. Treating AC-1 as the placeholder rename:
18 `ComicApp` → `Sleeve` (replace_all). Verified zero `Slabd`
occurrences before and after.

### ideate/architecture.md (AC-1)

3 `ComicApp` → `Sleeve` (replace_all). Title line, executive-summary
opening, and one trailing acceptance-criterion line at L1659.

### ideate/prd-audit.md (AC-1)

12 `ComicApp` → `Sleeve` (replace_all). Audit-record fixtures (Q&A
table + discovery summary).

### ideate/architecture-audit.md (AC-1)

0 occurrences of either `Slabd` or `ComicApp`. No edit.

### docs/superpowers/specs/2026-05-10-brand-language-design.md (AC-2, AC-4)

Targeted edits — *not* a blind replace_all because the file contains
intentional historical record that must be preserved:

- **Title line**: `Brand Language — Slabd` → `Brand Language — Sleeve`
- **Date line**: added third entry `2026-05-11 (renamed Slabd → Sleeve per issue #40)`
- **Project line**: rewrote to capture chronology — `Sleeve — marketplace for comics (renamed from "Slabd"; earlier working titles "ComicApp" / "An Infinite Longbox")`
- **Scope-correction blockquote**: replaced the "slabbed is the brand-name's poetic root" framing with `bag-and-board "sleeve" is the brand name's collector-protective root` — the new metaphor is collector-protective, not graded.
- **Wordmark section** (AC-2): `SLABD` → `SLEEVE` in both the descriptive line and the code block. Added the explicit promise from issue #40: "Kerning and lockup rules from the prior 'SLABD' wordmark carry over unchanged — only the letterforms change."
- **Rim text row** (AC-4): string `"APPROVED ★ BY ★ THE ★ SLABD ★ COMICS ★ APP ★ "` → `"APPROVED ★ BY ★ THE ★ SLEEVE ★ COMICS ★ APP ★ "`. Appended a note: `textLength="257.6"` is unchanged because `spacingAndGlyphs` redistributes the marginal width across all glyphs (≈0.2% tighter per character for the one-char-longer string); seam-cleanliness verified at the locked sizes (40/60/80/128/marketing px). **Note**: there is no actual `.svg` file in the repo yet — the icon spec is text inside this markdown spec. Render verification at the locked sizes is deferred to the moment the icon is materialized (likely `/ignite:kickoff`, which is in the issue's out-of-scope section). The spec text is the source of truth this cycle is updating.
- **"Why this composition works" line**: `Slabd Comics App` → `Sleeve Comics App` (the parodied seal copy).
- **Anti-patterns line**: `Slabd is paper, not pixels` → `Sleeve is paper, not pixels`.
- **Downstream-changes block**: now reads "the following references update to 'Sleeve'", and the memory path was updated to `-Users-jarvis-Code-slabd/memory/project_sleeve.md` with the legacy `-Users-jarvis-Code-ComicApp/memory/project_comicapp.md` retained as historical record. The memory-dir directory name stays at `-Users-jarvis-Code-slabd` because the local working-directory rename is deferred per issue #40 (AC-5).
- **Outstanding verifications block**: re-issued for Sleeve (USPTO TESS, domain, social handles, App Store, common-law). Marked as deferred external admin work per the issue's out-of-scope section. Fallback name `Slabbd` → `Sleeved` (past-tense form; bag-and-board metaphor; further from the dictionary word "sleeve").
- **Iteration history table (L155–174)**: left untouched — historical brainstorm record.
- **Voice line L122** "raw and slabbed" — left untouched. "slabbed" here is collector vocabulary for the verb "to encapsulate in a CGC/CBCS slab", not the brand name. Removing it would break in-group register guidance.

### docs/superpowers/specs/2026-05-10-app-name-design.md (AC-3)

Added a Superseded header at the top of the file:

- **Title**: appended `(Superseded)`
- **Status line**: bold `**Superseded** — replaced by Sleeve per [issue #40](…) on 2026-05-11`, with a one-line note that the file is preserved as historical record.
- **Project line**: extended chronology — `ComicApp (working title) → **Slabd** (selected 2026-05-10) → **Sleeve** (renamed 2026-05-11)`.
- **Reader note blockquote**: directs the reader to `2026-05-10-brand-language-design.md` for live guidance and asks not to retroactively edit the rationale below.
- **Body of the spec (decision, rationale, eliminated candidates, verification list, iteration history)**: left untouched. The whole point of marking it superseded is to preserve the original decision rationale.

## Verification

- Repo-wide grep for un-renamed `Slabd`/`ComicApp` outside the
  superseded spec and rename-chronology lines: zero hits (verified
  with two targeted greps before envelope write).
- The four legitimate residual `ComicApp` mentions are all rename
  chronology / legacy-path references — preserved on purpose.
- All `Slabd` mentions that remain are either in the superseded spec
  body or in the rename-chronology lines of the brand-language spec.

## AC test evidence

This is a docs-only cycle; AC validation is done by grep, not by a
unit/integration test suite. The orchestrator envelope's
`ac_test_evidence` array is intentionally empty for this cycle and
documented here instead. AC-5 is intentionally deferred to cycle-2
(project-memory migration).

| AC | Evidence |
|----|----------|
| AC-1 | `grep -L "ComicApp\|Slabd" README.md ideate/{PRD,architecture,prd-audit,architecture-audit}.md` returns all five paths (no remaining hits except the preserved chronology) |
| AC-2 | `grep -n "SLEEVE" docs/superpowers/specs/2026-05-10-brand-language-design.md` shows wordmark line + code block + rim text; Oswald guidance + kerning/lockup carry-over note present |
| AC-3 | `grep -n "Superseded" docs/superpowers/specs/2026-05-10-app-name-design.md` matches the title and the status block with link to issue #40 |
| AC-4 | Rim-text string verified character-by-character: SLEEVE (6 chars) replaces SLABD (5 chars); `textLength="257.6"` documented as preserved; seam-clean rationale captured in the note |

## Proposed ontology terms

- Sleeve (product name)
- bag-and-board collector (brand metaphor source)
- sleeve-coded (in-group vocabulary descriptor)
- wordmark lockup (typographic rule term)
- rim text (CCA-seal parody component)
