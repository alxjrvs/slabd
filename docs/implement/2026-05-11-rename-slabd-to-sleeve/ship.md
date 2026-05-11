---
phase: 5
run_id: 2026-05-11-rename-slabd-to-sleeve
status: shipped
pr: 41
issue: 40
commits:
  - e4039d7 docs(rename) Slabd → Sleeve across product docs (cycle-1)
  - 9cdea51 chore(rename) cycle-2 memory migration + integration + review (#40)
---

# Phase 5 — Ship

## PR

[#41 — docs(rename): Slabd → Sleeve across product docs + brand spec](https://github.com/alxjrvs/slabd/pull/41)

## Issue

Closes #40 (Slabd → Sleeve rename).

## Deferred (intentional, per the issue's out-of-scope section)

- `package.json` `name` field rename — waits for the
  `/ignite:kickoff` scaffold step.
- Expo app config (`name`, `slug`, `scheme`) rename — same deferral.
- USPTO TESS pull for Sleeve in IC 9 / 35 / 42 — external admin work.
- Domain availability checks (`sleeve.com` / `.app` / `.io` / `.co` +
  fallbacks) — external admin work.
- Social handle availability checks (`@sleeve` on Instagram, X,
  TikTok) — external admin work.
- App Store name search for Sleeve — external admin work.
- Common-law prior-use search — external admin work.
- GitHub repo rename `alxjrvs/slabd` → `alxjrvs/sleeve` — separate,
  reversible decision; redirect implications.
- Local working directory rename `/Users/jarvis/Code/slabd` →
  `/Users/jarvis/Code/sleeve` — separate decision; breaks pinned
  paths.
- Implementation run-folder docs (`docs/implement/2026-05-11-*/`)
  already merged — these reference the historical product name only
  incidentally and can update in their normal next-touch.

## Ontology

Terms accreted into `ontology-updates.md`:

- Sleeve (product name)
- bag-and-board collector
- sleeve-coded
- wordmark lockup
- rim text
- Superseded (spec status convention)
