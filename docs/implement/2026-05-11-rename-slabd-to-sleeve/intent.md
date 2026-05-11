---
run_id: 2026-05-11-rename-slabd-to-sleeve
intent: >-
  Rename the product from Slabd to Sleeve across all repo documentation,
  the brand-language spec wordmark, the app icon SVG rim text, and project
  memory. Mark the prior app-name spec as superseded with a link to this
  issue. Scaffolding metadata (package.json, Expo config), trademark/domain
  verification, and GitHub/local directory renames are explicitly deferred
  per the issue's own out-of-scope section.
acceptance_criteria:
  - id: AC-1
    text: >-
      All repo docs reference Sleeve, not Slabd, in product-name positions.
      Specifically: README.md, ideate/PRD.md, ideate/architecture.md,
      ideate/prd-audit.md, ideate/architecture-audit.md. Implementation
      run-folder docs (docs/implement/2026-05-11-*) are NOT mass-renamed —
      they reference the historical name only incidentally per the issue's
      out-of-scope clause.
  - id: AC-2
    text: >-
      docs/superpowers/specs/2026-05-10-brand-language-design.md has its
      wordmark section updated to "SLEEVE" in Oswald with the existing
      kerning and lockup rules preserved. Voice, palette, and downstream-
      changes list reflect the new name.
  - id: AC-3
    text: >-
      docs/superpowers/specs/2026-05-10-app-name-design.md is marked
      Status&nbsp;Superseded with a link back to issue #40, preserving its
      original decision rationale as historical record.
  - id: AC-4
    text: >-
      The app icon SVG rim text is updated from "APPROVED ★ BY ★ THE ★
      SLABD ★ COMICS ★ APP ★ " to "APPROVED ★ BY ★ THE ★ SLEEVE ★ COMICS
      ★ APP ★ " and renders seam-clean at the locked sizes (40 / 60 / 80 /
      128 / marketing px). The textLength="257.6" and
      lengthAdjust="spacingAndGlyphs" attributes are re-verified or
      adjusted as needed to accommodate the one-character-longer string.
  - id: AC-5
    text: >-
      Project memory at /Users/jarvis/.claude/projects/-Users-jarvis-Code-slabd/memory/
      has product-name entries updated to Sleeve where applicable. The
      memory directory itself stays at -Users-jarvis-Code-slabd unless the
      local working directory is renamed (which is deferred).
proposed_ontology_terms:
  - Sleeve
  - bag-and-board collector
  - sleeve-coded
  - wordmark lockup
  - rim text
source:
  kind: issue
  ref: "alxjrvs/slabd#40"
---

# Intent — Rename Slabd → Sleeve

## Intent

Rename the product from Slabd to Sleeve across all repo documentation,
the brand-language spec wordmark, the app icon SVG rim text, and project
memory. Mark the prior app-name spec as superseded with a link to this
issue. Scaffolding metadata (package.json, Expo config),
trademark/domain verification, and GitHub/local directory renames are
explicitly deferred per the issue's own out-of-scope section.

## Acceptance Criteria

- **AC-1**: All repo docs reference Sleeve, not Slabd, in product-name positions. Specifically: `README.md`, `ideate/PRD.md`, `ideate/architecture.md`, `ideate/prd-audit.md`, `ideate/architecture-audit.md`. Implementation run-folder docs (`docs/implement/2026-05-11-*`) are NOT mass-renamed — they reference the historical name only incidentally per the issue's out-of-scope clause.
- **AC-2**: `docs/superpowers/specs/2026-05-10-brand-language-design.md` has its wordmark section updated to **SLEEVE** in Oswald with the existing kerning and lockup rules preserved. Voice, palette, and downstream-changes list reflect the new name.
- **AC-3**: `docs/superpowers/specs/2026-05-10-app-name-design.md` is marked **Status: Superseded** with a link back to issue #40, preserving its original decision rationale as historical record.
- **AC-4**: The app icon SVG rim text is updated from `"APPROVED ★ BY ★ THE ★ SLABD ★ COMICS ★ APP ★ "` to `"APPROVED ★ BY ★ THE ★ SLEEVE ★ COMICS ★ APP ★ "` and renders seam-clean at the locked sizes (40 / 60 / 80 / 128 / marketing px). The `textLength="257.6"` and `lengthAdjust="spacingAndGlyphs"` attributes are re-verified or adjusted as needed to accommodate the one-character-longer string.
- **AC-5**: Project memory at `/Users/jarvis/.claude/projects/-Users-jarvis-Code-slabd/memory/` has product-name entries updated to Sleeve where applicable. The memory directory itself stays at `-Users-jarvis-Code-slabd` unless the local working directory is renamed (which is deferred).

## Out of Scope

- `package.json` `name` field rename (deferred until `ignite:kickoff` runs)
- Expo app config (`name`, `slug`, `scheme`) rename (same deferral)
- USPTO TESS pull for Sleeve in IC 9 / 35 / 42 (external admin work)
- Domain availability checks (`sleeve.com` / `.app` / `.io` / `.co` + fallbacks) (external admin work)
- Social handle availability checks (external admin work)
- App Store name search (external admin work)
- Common-law prior-use search (external admin work)
- GitHub repo rename `alxjrvs/slabd` → `alxjrvs/sleeve` (separate, reversible decision; redirect implications)
- Local working directory rename `/Users/jarvis/Code/slabd` → `/Users/jarvis/Code/sleeve` (separate decision; breaks pinned paths)
- Brand-direction changes beyond the name and wordmark (Catalog Index palette, Oswald / Plex type stack, CCA-seal icon composition all stay)
- Code in `docs/implement/2026-05-11-*/` runs that's already merged — these reference the product name only incidentally and can update in their normal next-touch

## Source

GitHub issue [alxjrvs/slabd#40](https://github.com/alxjrvs/slabd/issues/40)
(body SHA: `82b55daf8efc257aae8b91869380f5dbe530e3ef`).

<!-- implement:run_id=2026-05-11-rename-slabd-to-sleeve -->
