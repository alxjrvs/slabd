# AUDIT — Ideate Architecture Pipeline Q&A Record

> Debug artifact. Records all clarifying Q&A and key decisions from the architecture pipeline run.

---

## Milestones
_Completed: 2026-05-10_

### Q&A Log

No clarifying questions were required. The PRD (`ideate/PRD.md` v1.0) was sufficiently detailed to generate milestones from the 37 REQ-IDs without ambiguity. Headless mode — autonomous synthesis from the PRD.

### Project Sizing

**Medium project** (3-4 milestones, ~12-15 deliverable groups). Drivers:
- 37 REQ-IDs (19 functional, 10 NFR, 8 integrations)
- Multi-platform Expo target (iOS, Android, Web)
- Multiple regulated integrations (payments/escrow, shipping, tax, KYC)
- Hybrid curator/marketplace model with two distinct admin surfaces

### Milestone Map

| Order | Milestone | Primary Focus |
|-------|-----------|---------------|
| 1 | **Foundation** | Repo scaffolding, Expo app shell, auth, image pipeline, payments POC, GCD catalog integration |
| 2 | **Marketplace Core** | Swipe UI, filters, listings, curated decks, transaction flow, escrow, shipping |
| 3 | **Compliance & Launch** | KYC/1099-K, tax, disputes/mediation, admin console, accessibility, performance hardening, app store + production deploy |

> **Note on timeline and effort:** This milestone map defines *what* gets delivered and in *what order*. For calendar duration, engineering effort, and staffing, see the staffing data in Phase 3.

### Workstream Dependencies

```
┌───────────────────────────────────────────────────────────────┐
│                                                                 │
│  Backend Platform & Integrations                                │
│  (API, Auth, DB, Stripe Connect, Shippo/EasyPost, GCD, Tax)     │
│         ▲                            ▲                          │
│         │                            │                          │
│         └────────┬───────────────────┘                          │
│                  │                                              │
│  ┌───────────────┴───────────────┐                              │
│  │                               │                              │
│  ▼                               ▼                              │
│ Expo App (iOS / Android / Web)   Admin Console (Web)            │
│ — Swipe UI, listings, txns       — Curation, moderation, KYC    │
│                                                                 │
│ Dependencies:                                                   │
│ • Both clients depend on Backend API & shared auth              │
│ • Admin Console gates editorial decks consumed in the Expo app  │
│ • Compliance integrations gate transaction & payout flows       │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
```

### Billing & Payment Structure

| Payment | Trigger | Amount |
|---------|---------|--------|
| **Payment 1 — Deposit** | Project kickoff | 25% |
| **Payment 2 — Foundation Complete** | Milestone 1 accepted | 25% |
| **Payment 3 — Marketplace Core Accepted** | Milestone 2 accepted | 25% |
| **Payment 4 — Launch** | Milestone 3 accepted + production deployment | 25% |

### AI Leverage Key

| Rating | Meaning | Impact on Effort |
|--------|---------|-----------------|
| **Heavy** | AI generates the bulk of code/output; engineer reviews and refines | 60–80% faster |
| **Moderate** | AI assists significantly; integration, debugging, or platform-specific work requires human judgment | 30–50% faster |
| **Minimal** | Human-gated (manual QA, configuration, stakeholder coordination, compliance review) | 0–20% faster |

---

## Milestone 1: Foundation

### Features

| Feature | Description | Requirements |
|---|---|---|
| User authentication | Sign-up, login, password reset, session — buyer and seller roles | REQ-010, REQ-011 |
| Image pipeline | Upload, CDN distribution, multi-resolution variants | REQ-005, REQ-032 |
| Listing schema (data only) | Database model, attribute taxonomy, GCD lookup back-end | REQ-006, REQ-036 |
| Payments POC | Stripe Connect Express onboarding round-trip; sandbox charge | REQ-011, REQ-030 |
| Observability baseline | Structured logging, error tracking, metrics dashboards | REQ-028, REQ-037 |

### Definition of Done

- [ ] All M1 features implemented and pass acceptance criteria
- [ ] OpenAPI spec for auth, profile, listing-draft, and image-upload endpoints; spec validates
- [ ] Database migrations versioned and applied to staging
- [ ] Stripe Connect onboarding round-trip working in sandbox; one successful test charge end-to-end
- [ ] GCD lookup returns metadata for a known issue in <1.5s p95
- [ ] Unit + integration test coverage ≥80% on new code; zero P0 bugs
- [ ] CI pipeline (lint, type, test, build) green on `main`
- [ ] App boots in Expo Go on iOS, Android, and Web from a single codebase
- [ ] Stakeholder demo completed; founder sign-off recorded

**Billing Gate:** Payment 2 (25%) triggered upon acceptance.

### 1A — Repository Scaffolding

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Monorepo initialization | Expo (React Native + Web) app, server workspace, shared types package; bun workspace | App boots locally; `bun run dev` starts client + server | Heavy |
| Dev tooling | TypeScript strict, ESLint, Prettier, lefthook git hooks, commit lint | All checks pass on clean repo | Heavy |
| Test infrastructure | Vitest/Jest for unit, Playwright for web E2E, Detox for native smoke; coverage reporting | `test` runs and reports coverage; one smoke test per workspace | Heavy |
| CI pipeline | GitHub Actions: lint, typecheck, test, build per workspace; preview deploy on PR | CI green on `main`; PR builds publish a web preview | Heavy |

### 1B — Backend Foundation

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| API surface (v1) | REST + JSON, OpenAPI 3.0, generated TS client | Spec validates; client used in app | Heavy |
| Database schema (v1) | PostgreSQL: users, seller_accounts, listings (draft), media, audit_log | Schema normalized; migrations versioned; row-level access policies on user-owned tables | Heavy |
| Auth & sessions | Email + OAuth provider (Auth0/Clerk-compatible), JWT, refresh, role claims (buyer/seller/admin) | Login + refresh + revoke working; role claims gate seller-only endpoints | Heavy |
| Image upload pipeline | S3-compatible storage, signed URL upload, CDN with image transform variants | Upload from app → CDN URL returned <3s p95 for 5MB image | Moderate |

### 1C — Integrations POC

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Stripe Connect Express POC | Seller onboarding stub, sandbox account create, intent flow, webhook receipt | Sandbox seller created end-to-end; webhook log shows lifecycle events | Moderate |
| GCD catalog lookup | Read-only adapter for issue/series metadata search and detail | Lookup returns metadata in <1.5s p95; cache layer with TTL | Moderate |
| Notification provider POC | Push provider (Expo Notifications) + transactional email (Postmark/SES) sandbox | Test push + email delivered to test devices | Heavy |
| Tax provider POC | Stripe Tax or TaxJar sandbox: tax calculation for a sample US-to-US order | Tax calc returns within latency budget; logged for review | Minimal |

### 1D — Cross-Cutting Foundation

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Structured logging | Correlation IDs, log levels, JSON output | All API requests logged with correlation ID; log query in dashboard | Heavy |
| Error tracking | Client + server Sentry integration | Errors surface in Sentry with source maps; release tagging | Heavy |
| Metrics dashboards | Latency, error rate, throughput baselines | Grafana/Datadog board live with SLO panels | Moderate |
| Feature flag scaffold | Provider-agnostic flag SDK wrapping a server registry | First flag toggles a sample feature end-to-end | Heavy |
| Secrets & config | Per-environment config, secret manager, .env hygiene | No secrets in repo; secret rotation procedure documented | Minimal |

### 1E — App Shell

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Navigation skeleton | Expo Router tabs (Swipe / Decks / Listings / Account), auth-gated routes | All tabs render placeholder; auth redirects working | Heavy |
| Design system primitives | Theme, type scale, spacing, button/card/input primitives, dark mode | Storybook (web) renders all primitives; WCAG contrast pass | Heavy |
| Account & profile screen | Edit profile, avatar upload, sign-out, role-aware UI | Buyer/seller modes visually distinct; profile edits persist | Heavy |

**M1 Risk Factors**

| Risk | Impact | Mitigation |
|------|--------|------------|
| GCD licensing / rate limits unconfirmed | Catalog lookup may need fallback | Cache aggressively; design adapter for swap to alternate source |
| Stripe Connect onboarding UX complexity | Sellers churn before activation | POC measures completion; defer KYC tightening to M3 |
| Expo Web parity gaps | Swipe gesture or media performance issues on web | Ship web with a "limited gestures" message; reassess in M2 |

---

## Milestone 2: Marketplace Core

### Features

| Feature | Description | Requirements |
|---|---|---|
| Swipe discovery (the invariant) | Tinder-style card stack on filtered deck; like / pass / save | REQ-001, REQ-002, REQ-021 |
| Filter system | Narrow the swipe deck by title/series/era/grade/price; never replaces swipe UI | REQ-003 |
| Listing creation | Seller drafts, attribute capture, GCD-assisted lookup, media, publish | REQ-004, REQ-005, REQ-006 |
| Seller onboarding (full) | Stripe Connect onboarding production-ready (sub-1099-K threshold) | REQ-011, REQ-030 |
| Curated decks (editorial) | Admin builds named themed decks of listings; buyer-facing surface | REQ-007, REQ-008 |
| Open marketplace browse | List/grid view + search alongside swipe; buyers can browse without swiping | REQ-009 |
| Purchase flow | Add to cart (1-item), payment intent, address, confirm | REQ-013, REQ-030 |
| Escrow & payout | Funds captured at purchase; held until delivery confirmation; payout on confirm | REQ-014, REQ-030 |
| Shipping labels | Buyer ship-to; seller buys label via Shippo/EasyPost; tracking ingestion | REQ-015, REQ-031 |
| Push & email notifications | Listing activity, sale, label, delivery, payout | REQ-017, REQ-033 |

### Definition of Done

- [ ] All M2 features implemented; acceptance criteria pass
- [ ] End-to-end purchase: list → swipe → buy → ship → deliver → payout works in staging across iOS, Android, Web
- [ ] Swipe UI sustains 60fps on reference iPhone 12 and Pixel 6; no spinner when user swipes at ≥1/2s (REQ-021)
- [ ] Test coverage ≥80% on new code; critical paths covered by Playwright + Detox E2E
- [ ] Performance budgets met: app cold start <3s p95, swipe load <500ms p95 (REQ-020)
- [ ] Zero P0 bugs; P1 bugs documented
- [ ] Stakeholder demo completed; founder sign-off recorded

**Billing Gate:** Payment 3 (25%) triggered upon acceptance.

### 2A — Discovery Surface (Swipe + Filters)

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Swipe deck engine | Card stack, gesture, animations, prefetch, persistence of pass/like state per session | 60fps on reference devices; no spinner during steady swiping | Moderate |
| Deck composition service | Server-side ranked deck for current filter, with paginated prefetch | Returns 25 cards <500ms p95; deck regenerates on filter change | Heavy |
| Filter UI | Faceted filters (series, grade band, price band, era, seller tier) that narrow — not replace — the swipe deck | Toggling any filter regenerates deck; "no results" path keeps swipe UI present with empty state | Heavy |
| Like/Save/Pass actions | Persist per-user listing affinity; "Saved" surface | Saved list renders; pass list reduces deck dedup | Heavy |

### 2B — Listings & Catalog

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Seller listing creation | Multi-step draft → publish; GCD-assisted attribute prefill | Seller can publish a listing in <4 minutes from cold start | Heavy |
| Media management | Multi-image upload, primary image selection, ordering, retake | Up to 8 images per listing; ordering persists | Heavy |
| Catalog enrichment | GCD lookup integrated; manual override fields | All required attrs captured even if GCD lookup fails | Moderate |
| Listings index & search | Server-side keyword + faceted search; pagination | Search returns results <800ms p95; pagination stable | Heavy |
| Marketplace browse | List/grid view for users who prefer browsing to swiping | Browse surface coexists with swipe; deep link to listing | Heavy |

### 2C — Curation Surface

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Admin deck builder | Web admin: search listings, drag/drop to deck, publish/unpublish | Admin can create a named deck of 10–100 listings | Heavy |
| Buyer deck consumption | "Featured" tab in app; deck → swipe deck transition | Featured deck loads as swipe deck source | Heavy |
| Editorial metadata | Deck title, hero image, blurb, optional tags | Deck metadata renders consistently across surfaces | Heavy |

### 2D — Commerce & Fulfillment

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Cart & checkout | Single-item cart, address, payment intent | Buyer completes checkout in <90s from listing | Heavy |
| Stripe Connect transactions | Payment capture, transfer to seller balance, fees, refunds | All successful, refund, and failure paths covered by tests | Moderate |
| Escrow & payout state machine | Held → ship → deliver → release → payout; manual admin override hooks | State transitions auditable; payout triggered on confirmed delivery | Moderate |
| Shipping label purchase | Shippo/EasyPost integration; label PDF; tracking webhook | Seller buys label; tracking events drive state machine | Moderate |
| Order history | Buyer & seller order views; receipt PDF | Both parties see same canonical order state | Heavy |

### 2E — Notifications & Engagement

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Push notifications | Lifecycle events: listing sold, label needed, shipped, delivered, payout | Per-user preferences respected; opt-out works | Heavy |
| Transactional email | Same events; templated; brand-consistent | Email delivery >99% on test runs; spam score acceptable | Moderate |
| In-app inbox | Unified activity feed | Inbox renders in <500ms p95 | Heavy |

**M2 Level 2 Decomposition — Swipe Deck Engine**

Internal subcomponents:
- `DeckSource` — fetches and prefetches paginated cards from server
- `CardRenderer` — image-first card with grade chip, price, seller badge
- `GestureLayer` — pan/throw gestures with velocity threshold; haptic
- `AffinityStore` — like/pass/save persistence (local-first, server-synced)
- `EmptyState` — preserves swipe shell when zero results (filters can narrow to nothing)

Key interfaces: `DeckSource → CardRenderer` over an observable queue; `GestureLayer → AffinityStore` decoupled by action events.

**M2 Risk Factors**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Swipe UI performance on low-end Android | Core experience degraded | Set device tier matrix; ship low-fi fallback animations |
| Escrow/payout edge cases (refunds, chargebacks) | Money correctness — critical | State machine + invariant tests; manual admin override path |
| Seller drop-off mid-listing | Supply growth flat | Save-and-resume drafts; GCD prefill reduces fields |

---

## Milestone 3: Compliance & Launch

### Features

| Feature | Description | Requirements |
|---|---|---|
| KYC at threshold | Trigger Stripe Connect KYC when cumulative payouts approach $600 (1099-K trigger) | REQ-012, REQ-030 |
| Tax calculation | Tax provider calc on checkout; collection where required | REQ-034 |
| Disputes & mediation | Buyer/seller dispute flow; admin mediation tools; resolution states | REQ-016 |
| Admin console | Moderation queue, user lookup, dispute mediation, deck builder, financial ops view | REQ-018 |
| Counterfeit/fraud signals | Report-listing flow; takedown; signal aggregation for trust review | REQ-019 |
| Accessibility | WCAG 2.1 AA on web; native a11y labels and dynamic type | REQ-024 |
| Performance hardening | Hit SLOs; image optimization; cold-start budget | REQ-020, REQ-021 |
| Security validation | Pen test, OWASP top-10 review, dependency audit | REQ-022, REQ-023 |
| Reliability hardening | Health checks, backups, restore drill, runbooks | REQ-025, REQ-026 |
| Observability completion | SLO dashboards, alerts, error budget policy | REQ-028 |
| App store + production deploy | iOS App Store, Google Play, web production behind CDN | REQ-027, REQ-029 |

### Definition of Done

- [ ] All M3 features implemented; acceptance criteria pass
- [ ] WCAG 2.1 AA audit passes on web; native a11y verified with VoiceOver/TalkBack walkthroughs
- [ ] Pen test conducted; all high/critical findings remediated or formally accepted by founder
- [ ] Disaster recovery drill: full DB restore from backup in <4 hours
- [ ] All SLOs (latency, availability, error rate) green for 7 consecutive days in staging soak
- [ ] iOS App Store and Google Play submissions accepted; web production deployed
- [ ] All test suites green; coverage ≥80% project-wide
- [ ] Zero P0 bugs; P1 bugs documented or fixed
- [ ] Runbooks: on-call, incident response, refund/chargeback, KYC escalation, takedown — written and reviewed
- [ ] Founder sign-off recorded; launch readiness review completed

**Billing Gate:** Payment 4 (25%) triggered upon acceptance + production deployment.

### 3A — Compliance & Trust

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| KYC threshold trigger | Cumulative-payout watcher initiates Stripe-hosted KYC at threshold | Test sellers crossing threshold are KYC-gated before next payout | Moderate |
| Tax calculation + collection | Stripe Tax / TaxJar integrated; rate by ship-to; collected at checkout | Sample orders across 5 US states produce correct tax line | Minimal |
| Disputes & mediation flow | Buyer "open dispute" → seller response → admin decision → resolution state | All four states observable in admin; payout pause works | Moderate |
| Counterfeit/fraud reporting | "Report listing" → moderation queue → takedown action | Reported listing hidden within SLA; reporter notified | Heavy |
| Marketplace facilitator review | Legal/compliance checklist; sales tax permits where required | Checklist signed off; permits filed or scheduled | Minimal |

### 3B — Admin Console

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Admin auth & RBAC | Separate admin login, audit log of admin actions | All admin actions logged with actor + before/after | Heavy |
| Moderation queue | Reported listings, flagged users; takedown, restore | Triage time <60s per item | Heavy |
| Financial ops view | Stripe balance, payout schedule, refund tooling | Refund flow tested end-to-end in sandbox | Moderate |
| Dispute mediation UI | Side-by-side evidence view; resolution actions | Mediator can resolve test disputes in admin | Heavy |
| User & listing lookup | Search across users, listings, orders | Lookup p95 <500ms; supports CSV export of sample data | Heavy |

### 3C — Quality, Performance & Launch Readiness

| Deliverable | Description | Acceptance Criteria | AI Leverage |
|---|---|---|---|
| Accessibility audit | Automated axe-core pass + manual screen reader walkthroughs | WCAG 2.1 AA on web; native a11y labels on every interactive element | Moderate |
| Performance hardening | Image sizing, lazy load, prefetch tuning, query optimization | All NFR latency/cold-start targets hit (REQ-020/021) | Moderate |
| Security validation | Third-party pen test, dependency audit, secret scan | Zero critical findings; high findings remediated | Minimal |
| Reliability drills | Backup, restore, failover, DR runbook | Restore-from-backup drill <4 hours; runbook reviewed | Minimal |
| Observability completion | SLOs defined, alerts wired, error budget policy | On-call dashboard live; alert simulation works | Moderate |
| App store submission | iOS App Store + Google Play submission packages | Both stores accept submission within Launch window | Minimal |
| Production deployment | Infra cutover, CDN, monitoring on production | Production smoke passes; rollback playbook exercised | Minimal |
| Beta program | Closed beta with seed sellers + buyers; feedback loop | ≥10 sellers active, ≥50 listings, ≥100 buyer sessions during beta | Minimal |

**M3 Risk Factors**

| Risk | Impact | Mitigation |
|------|--------|------------|
| App store review rejection | Launch delay | Submit early in M3; use TestFlight/Internal Testing pre-submission |
| KYC friction at threshold | Sellers stranded mid-payout | Notify in-app well before threshold; partial-payout fallback |
| Tax misconfiguration | Legal/financial exposure | Use a managed tax provider; review with counsel before launch |
| Pen test surfaces critical findings late | Launch slip | Schedule pen test mid-M3, not end; reserve time for remediation |
| Counterfeit takedown disputes | PR exposure | Conservative takedown SLA; written appeal process |

---

## Cross-Milestone Build Order & Dependency Matrix

| Deliverable Group | Depends On | Unlocks |
|---|---|---|
| 1A Repo Scaffolding | — | All subsequent work |
| 1B Backend Foundation | 1A | 1C, 1D, 1E, all of M2 |
| 1C Integrations POC | 1B | 2D, 3A |
| 1D Cross-Cutting Foundation | 1A, 1B | 2A–2E, 3C |
| 1E App Shell | 1A, 1B | 2A–2E |
| 2A Discovery Surface | 1B, 1E, 2B | 2C, M3 perf hardening |
| 2B Listings & Catalog | 1B, 1C (GCD), 1E | 2A, 2C, 2D |
| 2C Curation Surface | 2B, 3B-style admin foundations (subset built in M2) | Buyer-facing featured surface |
| 2D Commerce & Fulfillment | 1C (Stripe POC), 2B | 3A KYC, 3A disputes |
| 2E Notifications & Engagement | 1C (notif POC), 2D | M3 ops |
| 3A Compliance & Trust | 2D | Production launch readiness |
| 3B Admin Console | 2B, 2C, 2D | 3A operationalization |
| 3C Quality, Performance & Launch | All prior | Production deployment |

---

## Story / REQ-ID Mapping Skeleton

(Full Gherkin stories generated during Phase 4 assembly into Appendix A.)

### Milestone 1 — Foundation
- S-1.1 Buyer sign-up & profile (REQ-010, REQ-024)
- S-1.2 Seller sign-up + Stripe Connect Express onboarding (REQ-011, REQ-030)
- S-1.3 Image upload pipeline (REQ-005, REQ-032)
- S-1.4 GCD catalog lookup (REQ-006, REQ-036)
- S-1.5 Observability baseline (REQ-028, REQ-037)
- S-1.6 Auth security baseline — sessions, password reset, rate-limit (REQ-022, REQ-023)
- S-1.7 CI pipeline & deployment scaffolding (REQ-027, REQ-029)

### Milestone 2 — Marketplace Core
- S-2.1 Swipe discovery on a filtered deck (REQ-001, REQ-002)
- S-2.2 Filters narrow the deck (REQ-003)
- S-2.3 Like / pass / save (REQ-001)
- S-2.4 Seller drafts and publishes a listing (REQ-004, REQ-005, REQ-006)
- S-2.5 Buyer browses the open marketplace (REQ-009)
- S-2.6 Editorial team builds a curated deck (REQ-007)
- S-2.7 Buyer consumes a curated deck via swipe (REQ-008)
- S-2.8 Buyer purchases a listing (REQ-013, REQ-030)
- S-2.9 Funds held in escrow; payout on delivery confirmation (REQ-014, REQ-030)
- S-2.10 Seller buys a shipping label and tracking ingests (REQ-015, REQ-031)
- S-2.11 Lifecycle push + email notifications (REQ-017, REQ-033)
- S-2.12 Performance budgets met for swipe and listings (REQ-020, REQ-021)

### Milestone 3 — Compliance & Launch
- S-3.1 KYC trigger at 1099-K threshold (REQ-012, REQ-030)
- S-3.2 Tax calculation at checkout (REQ-034)
- S-3.3 Buyer opens a dispute; admin mediates (REQ-016, REQ-018)
- S-3.4 Listing reported and taken down (REQ-019, REQ-018)
- S-3.5 Admin moderation, lookup, financial ops (REQ-018)
- S-3.6 WCAG 2.1 AA accessibility on web + native a11y (REQ-024)
- S-3.7 Security validation: pen test + dep audit (REQ-022, REQ-023)
- S-3.8 Reliability: backups, restore drill, SLOs (REQ-025, REQ-026, REQ-028)
- S-3.9 App store submission (REQ-029)
- S-3.10 Production deployment + CDN (REQ-027, REQ-029)
- S-3.11 Closed beta program (validation metric harvest)

---

## Milestone Summary

| Milestone | Deliverable Groups | Total Deliverables | Leverage Profile | Billing Gate |
|-----------|--------------------|--------------------|------------------|--------------|
| **M1: Foundation** | 5 groups (1A–1E) | 18 | Mostly Heavy | Payment 2 (25%) |
| **M2: Marketplace Core** | 5 groups (2A–2E) | 19 | Heavy + Moderate | Payment 3 (25%) |
| **M3: Compliance & Launch** | 3 groups (3A–3C) | 18 | Mostly Moderate–Minimal | Payment 4 (25%) |
| **TOTAL** | **13 groups** | **55** | | **100%** |

---

## Key Assumptions

1. **Stack:** Expo (React Native + Web) for client; managed Postgres + Node/TypeScript server. Locked in Phase 2 (Tech Spec).
2. **Payments:** Stripe Connect Express (deferred-KYC) for v1; threshold-triggered KYC at 1099-K limit.
3. **Catalog:** GCD usable as primary metadata source under appropriate license / read-only access.
4. **US-only:** All compliance, tax, and shipping work scoped to US ship-from / ship-to in v1.
5. **Curator surface uses the same swipe UI** — invariant core; filters narrow but never replace.
6. **No live auctions, social features, in-house grading, or international support in v1** — locked from PRD §5.4.
7. **Beta program** in M3 doubles as the early validation harvest for §6.0 success metrics.
8. **Admin Console** is web-only and small surface — built once in M3 with M2 stubs for deck builder + moderation queue if needed earlier.

---

## Tech Spec
_Completed: 2026-05-10_

### Q&A Log

No clarifying questions were required. The PRD (`ideate/PRD.md` v1.0) specifies Expo (React Native + Web), Stripe Connect, GCD, and US-only v1; combined with the milestone map this was sufficient to draft the architecture autonomously. Headless mode — assumptions logged below.

### Solution Strategy

| Product Goal | Approach | Technologies |
|---|---|---|
| Tinder-style swipe on a US comics marketplace | Single Expo codebase for iOS, Android, Web; server-side ranked decks with client-side prefetch | Expo SDK 55, React Native, Expo Router, React Native Reanimated, React Native Gesture Handler |
| Curated decks + open marketplace | Same swipe runtime, two deck sources (editorial-published vs filtered search); admin web app authors decks | Server-rendered deck composer; shared types via bun workspaces |
| Payments with escrow & US tax | Stripe Connect Express with deferred KYC; Stripe Tax; cumulative-payout watcher triggers KYC at 1099-K threshold | Stripe Connect, Stripe Tax, Stripe Webhooks |
| Image-first discovery | Direct-to-CDN upload, transform variants, lazy media | Cloudflare R2 + Images (or S3 + CloudFront) |
| Founder-stage cost discipline | Single managed Postgres, one server runtime, vendor-managed auth + tax + payments | Neon (or Supabase) Postgres, Clerk auth, Fly.io runtime |
| WCAG 2.1 AA + native a11y | Design system from M1 with accessible primitives; axe-core in CI for web; native a11y labels enforced via lint rule | Storybook (web), eslint-plugin-react-native-a11y, axe Playwright |

### Project Breakdown

| Project | Purpose | Tech Stack | Documentation |
|---------|---------|------------|--------------|
| **Mobile + Web App** | Buyer & seller client; swipe, browse, list, transact | Expo SDK 55, React Native, React Native Web, TypeScript, Expo Router, TanStack Query, Reanimated, Gesture Handler | [Expo](https://docs.expo.dev/), [React Native](https://reactnative.dev/docs/), [TanStack Query](https://tanstack.com/query/latest) |
| **Backend API** | Core domain, listings, deck composition, transactions, integrations | Node.js 20 LTS, TypeScript, Hono, Drizzle ORM, Postgres | [Hono](https://hono.dev/), [Drizzle](https://orm.drizzle.team/) |
| **Admin Console** | Editorial deck builder, moderation, dispute mediation, financial ops | React + Vite (web-only), TypeScript, shared design tokens with the app | [Vite](https://vitejs.dev/), [React](https://react.dev/) |
| **Background Workers** | Webhook processing (Stripe, Shippo), payout state machine, threshold-watch, notification fan-out, image post-processing | Node.js workers, BullMQ on Redis | [BullMQ](https://docs.bullmq.io/) |
| **Shared Types Package** | Domain types shared across app, admin, server | TypeScript, Zod schemas, bun workspace | [Zod](https://zod.dev/) |

### Separation of Responsibilities

**Mobile + Web App** owns swipe runtime, gesture/animation, local affinity state, network adapter, image rendering, push registration, and seller listing UI. Does **not** own ranking, escrow state, or any source of truth.

**Backend API** owns all business rules: listing lifecycle, deck composition, transaction state machine, escrow & payout, KYC-trigger logic, dispute lifecycle, admin authorizations. Owns the canonical OpenAPI v1 contract.

**Admin Console** owns editorial workflows and moderator UX. Calls the Backend API; no separate domain logic.

**Background Workers** own asynchronous processing: webhook ingestion, payout state transitions, threshold checks, notification dispatch, image transform jobs. Workers are the only code path that mutates payout/escrow state in response to Stripe/Shippo events.

**Shared Types Package** owns Zod schemas for all API request/response shapes. Both the app and admin import the generated client.

### Integration Points

| System | Direction | Pattern | Purpose | Discovery Required | Documentation |
|---|---|---|---|---|---|
| **Stripe Connect (Express)** | Bidirectional | REST + Webhooks | Seller onboarding, payment intents, escrow via destination charges or held transfers, payouts, KYC | Account application + production approval; KYC requirements timing | [Stripe Connect](https://docs.stripe.com/connect) |
| **Stripe Tax** | Outbound | REST | US sales tax calculation at checkout | Tax registration where required | [Stripe Tax](https://docs.stripe.com/tax) |
| **Shippo** (primary) / EasyPost (alt) | Bidirectional | REST + Webhooks | Rate shopping, label purchase, tracking | Carrier accounts; rate negotiation | [Shippo](https://docs.goshippo.com/) |
| **Grand Comics Database (GCD)** | Outbound (read) | REST or DB mirror | Issue/series metadata lookup | Licensing terms; rate limits; mirror cadence | [GCD](https://www.comics.org/) |
| **Clerk** (primary) / Auth0 (alt) | Inbound (SDK) | OAuth/OIDC + JWT | Auth, sessions, social login, magic links | Tenancy + price tier | [Clerk](https://clerk.com/docs) |
| **Expo Notifications** | Outbound | Push gateway | iOS/Android push delivery | APNs/FCM keys provisioning | [Expo Notifications](https://docs.expo.dev/push-notifications/overview/) |
| **Postmark** (primary) / SES (alt) | Outbound | REST | Transactional email | Domain + DKIM/SPF | [Postmark](https://postmarkapp.com/developer) |
| **Cloudflare Images** | Outbound | REST + signed URLs | Image storage and transform variants | Account + plan | [Cloudflare Images](https://developers.cloudflare.com/images/) |
| **Sentry** | Outbound | SDK | Error tracking for app + server | Project provisioning | [Sentry](https://docs.sentry.io/) |
| **Datadog** (primary) / Grafana Cloud (alt) | Outbound | Metrics/Logs/Traces | Observability | Account + agent install | [Datadog](https://docs.datadoghq.com/) |

### Proposed Technology Stack

#### Core

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Client framework | **Expo SDK 55 (React Native + Web)** | One codebase across iOS, Android, Web; aligns with PRD §1.0 platform choice |
| Client language | **TypeScript (strict)** | Type-safety across client/server via shared package |
| Navigation | **Expo Router** | File-based routing, deep linking, shared across native/web |
| Server data fetching | **TanStack Query** | Cache, retries, optimistic updates; pairs naturally with REST |
| Animation/Gesture | **Reanimated + Gesture Handler** | Required for 60fps swipe at PRD §5.2 perf budgets |
| Backend runtime | **Node.js 20 LTS** | Mature ecosystem, fast iteration, well-supported by all integrations |
| Backend framework | **Hono** | Small, fast, edge-friendly, OpenAPI integration via `@hono/zod-openapi` |
| ORM | **Drizzle** | Type-safe SQL, no run-time overhead, easy migrations |
| Database | **PostgreSQL 16 (Neon)** | Serverless Postgres with branching for ephemeral envs; reduces ops |
| Cache / queues | **Redis (Upstash)** | Serverless Redis for BullMQ workers + rate-limits |
| Validation | **Zod** | Shared schemas for client/server boundary + database adapters |

#### Infrastructure

**Primary recommendation:** Fly.io for app runtime + Neon for Postgres + Upstash for Redis + Cloudflare for media/CDN.

| Component | Service | Purpose |
|-----------|---------|---------|
| API runtime | **Fly.io (autoscale)** | Region-pinned for US; cheap to start; cleanly scales | 
| Worker runtime | **Fly.io (separate process group)** | Workers run as a separate Fly app with autoscale | 
| Database | **Neon Postgres** | Serverless Postgres with branching | 
| Cache + queues | **Upstash Redis** | Serverless, pay-per-request | 
| Object storage + CDN | **Cloudflare R2 + Images** | Egress-free; built-in image transforms | 
| Static admin hosting | **Cloudflare Pages** | Edge-hosted Vite build | 
| Push gateway | **Expo Notifications** | Single API for APNs/FCM | 

**Alternative:** AWS (ECS Fargate, RDS, ElastiCache, S3 + CloudFront). Move to AWS if scale or compliance (e.g., specific BAA needs) demand it. Not required for v1.

#### Development & Operations

| Category | Tool | Purpose |
|----------|------|---------|
| Monorepo | **bun workspaces** | Aligns with user's preferred package manager |
| CI/CD | **GitHub Actions** | Build/test/preview deploys per PR |
| App release | **EAS (Expo Application Services)** | Native build + submission pipeline |
| Web release | **Fly.io + Cloudflare Pages** | API deploy on tag; admin deploy on merge |
| Feature flags | **PostHog feature flags** (or self-rolled) | Cohort flags for beta cohorts |
| Analytics | **PostHog** | Product analytics + session replay (web) |
| Error tracking | **Sentry** | Client + server with release tagging |
| Observability | **Datadog (free tier to start)** | Metrics + APM + log aggregation |

### Runtime Scenarios (Must-Have Happy Paths)

Below cover the runtime view for each Must-Have requirement. Each scenario lists building blocks and key decision points.

| REQ | Scenario | Building Blocks | Critical Decision Points |
|---|---|---|---|
| REQ-001/002/003 | Buyer opens app → app fetches a filter-narrowed deck → swipes through cards | App `SwipeDeck` → API `/decks/compose` → Postgres `listings` + ranking → Cloudflare Images for thumbnails | Server-side ranking model (recency/saved/seller-tier blend); client prefetch window; empty-deck fallback preserves swipe shell |
| REQ-004/005/006 | Seller creates a listing: GCD lookup prefill → upload images → publish | App listing flow → API `/listings/draft` → GCD adapter → Cloudflare R2/Images → API `/listings/publish` | When GCD lookup fails, manual entry fallback; image variants generated async; draft autosave |
| REQ-007/008 | Editor builds curated deck → buyer surfaces deck → swipes | Admin `DeckBuilder` → API `/decks` (admin) → buyer app `FeaturedTab` → reuses `SwipeDeck` | Decks treated identically to filtered decks downstream of `DeckSource` |
| REQ-009 | Buyer browses open marketplace | App `BrowseList` → API `/listings/search` → Postgres full-text + facet indexes | Search is keyword + facets; swipe remains primary entry point |
| REQ-010/011 | User signs up; if seller, Stripe Connect onboarding launches | App auth screen → Clerk → API `/me` → Stripe Connect Express link → return path | Buyer-only accounts skip Stripe; seller accounts created lazy on first listing |
| REQ-012 | Cumulative payouts approach $600 → KYC link served before next payout | Worker `ThresholdWatcher` → Stripe Connect `account_link` → app banner → blocks `payout_release` transition | Threshold gate, not retroactive; admin override path |
| REQ-013/014 | Buyer checks out → funds captured → held until delivery → payout | App `Checkout` → API `/orders` → Stripe `PaymentIntent` (destination charge w/ application_fee, transfer deferred) → Worker `PayoutStateMachine` | Capture model: hold on platform with delayed transfer until delivery confirm; refund path |
| REQ-015 | Seller buys label; tracking events drive state | API `/orders/{id}/label` → Shippo → label PDF → Shippo webhooks → Worker `TrackingIngest` → state machine | Webhook signature verification; tracking event normalization across carriers |
| REQ-016 | Buyer opens dispute → seller responds → admin decides | App `OpenDispute` → API `/disputes` → Admin queue → resolution action → Worker `EscrowAdjust` | Dispute pauses payout; resolution states; chargeback alignment with Stripe |
| REQ-017 | Lifecycle event → fan-out push + email | Domain event → Worker `NotificationFanout` → Expo Push + Postmark | Preference-aware fan-out; idempotent delivery; quiet hours |
| REQ-018 | Admin moderates a reported listing | Admin `ModerationQueue` → API `/moderation/{listing_id}` → audit log | All admin mutations logged with actor + before/after |
| REQ-019 | Buyer reports counterfeit → moderator reviews → takedown | App `ReportListing` → API `/reports` → Admin queue → soft-hide → notification | Soft-hide first, hard-delete after appeal window |

### Environment Strategy

| Environment | Purpose | Infrastructure |
|---|---|---|
| **Development** | Local + per-developer ephemeral DB via Neon branching; mock for Stripe/Shippo where possible | Local Expo + local API → Neon branch + Upstash dev instance |
| **Preview** | Per-PR web preview + API stub | Cloudflare Pages + Fly preview app on branch; Neon ephemeral branch |
| **Staging** | Integration testing, beta cohort during M3 | Production-mirror sizing; Stripe + Shippo sandbox accounts; real GCD reads |
| **Production** | Live system | Fly autoscaling, Neon production project, Cloudflare Images production plan, all webhooks live |

### Security Architecture

| Layer | Controls |
|-------|----------|
| **Network** | Fly internal networking for worker↔API; TLS 1.3 everywhere; Cloudflare WAF in front of admin + API public endpoints |
| **Authentication** | Clerk-managed sessions; JWT verified server-side; refresh rotation; mandatory MFA for admin |
| **Authorization** | RBAC: `buyer`, `seller`, `admin`, `moderator`. Listings ownership checks; admin endpoints gated; audit log on all admin mutations |
| **Data at Rest** | Neon/Postgres encryption at rest; Cloudflare R2 encryption; secrets in Fly secret store + 1Password vault for human-readable copies |
| **Data in Motion** | TLS 1.3; webhook signature verification (Stripe, Shippo); request signing on internal worker calls |
| **PCI Scope** | **SAQ-A** — Stripe Elements / Stripe-hosted onboarding ensures no card data touches our infra |
| **Image content** | Stripped EXIF on upload; configurable max size; moderation hooks on the image-process worker |
| **Secrets** | No secrets in repo; rotation runbook; pre-commit secret scanning |
| **Dependency hygiene** | Renovate bot for updates; `bun audit` in CI; lockfile committed |

**Compliance considerations**

| Requirement | Approach |
|---|---|
| PCI DSS | SAQ-A scope; Stripe-hosted card capture |
| US 1099-K (post-Aug 2026 thresholds) | Threshold watcher; Stripe Connect KYC at $600 cumulative payouts |
| US sales tax (state-by-state) | Stripe Tax; marketplace facilitator obligations reviewed before launch |
| CCPA / state privacy | Privacy policy + DSAR support; per-user data export + delete endpoints (M3) |
| Accessibility (WCAG 2.1 AA) | Audit in M3; CI gate on web via axe-core |

### Quality Requirements (NFR Cross-Reference)

| Attribute | Approach | REQ-IDs |
|---|---|---|
| Performance — cold start <3s, swipe load <500ms, no spinner during steady swiping | Server-side prefetch, edge image variants, native runtime | REQ-020, REQ-021 |
| Availability — 99.5% v1 | Multi-instance Fly autoscale; Neon HA; status page | REQ-025 |
| Reliability — backups + restore drill | Neon automated backups + monthly restore drill | REQ-026 |
| Security — OWASP top 10, no critical findings at launch | Pen test in M3; dep audit in CI | REQ-022, REQ-023 |
| Accessibility — WCAG 2.1 AA web; native a11y | Audit + CI gate | REQ-024 |
| Observability — logs, metrics, traces, SLO dashboards, alerts | Datadog + Sentry; SLOs defined in M3 | REQ-028 |
| Maintainability — typed end-to-end, shared schema package | Zod-derived types; OpenAPI generation | REQ-037 |

### Scalability & Performance

| Scenario | Volume | Approach |
|---|---|---|
| Beta — Early validation | ≤2K DAU, ≤10K listings | Single-region Fly autoscale; default Neon sizing |
| Year-1 growth | 5–20K DAU, 50K listings | Add read replica; consider Neon autoscaling; warm prefetch caches |
| Discovery burst (e.g., a featured deck goes viral) | 10× normal RPS for 1 hour | Cloudflare image cache absorbs; API rate-limit via Upstash; queue-based async fan-out for notifications |

### Architecture Decisions (MADRs)

#### ADR-001 — Expo (React Native + Web) for the client

- **Status:** Accepted
- **Context:** PRD §1.0 specifies "Expo, React Native + Web." Mobile-first, US-only, single team. Need iOS, Android, and Web from one codebase to keep founder-stage costs down.
- **Decision:** Build the client as a single Expo SDK 55 app with Expo Router; ship to iOS, Android, and Web from a unified codebase. Use Reanimated + Gesture Handler for the swipe surface.
- **Consequences:** + One team, one codebase, fastest path. + EAS handles native builds. − Web parity for some gestures may lag; mitigated by feature detection. − Vendor coupling to Expo's release cadence.
- **Alternatives considered:** Separate React Native + Next.js apps (rejected: 2× client teams); Flutter (rejected: ecosystem fit weaker for marketplace integrations).

#### ADR-002 — Stripe Connect Express with deferred KYC

- **Status:** Accepted
- **Context:** PRD assumption A1/A3: platform-escrow with KYC deferred to 1099-K threshold so seller onboarding is short. REQ-011, REQ-012, REQ-014.
- **Decision:** Use Stripe Connect Express. Defer KYC until cumulative payouts approach the $600 threshold; gate the next `payout_release` transition on KYC completion via a `ThresholdWatcher` worker. Held funds use Stripe's destination-charge + delayed-transfer model.
- **Consequences:** + Lowest seller friction at signup. + PCI scope stays at SAQ-A. − Threshold logic is custom; needs invariant tests. − Stripe is the source of truth for KYC; we mirror status.
- **Alternatives considered:** Custom Connect (rejected: full KYC up-front, high friction); Stripe Standard (rejected: less platform control); third-party escrow (rejected: too slow for v1).

#### ADR-003 — Single managed Postgres (Neon) over multi-store

- **Status:** Accepted
- **Context:** Founder-stage product, need transactional integrity for orders + flexible search.
- **Decision:** One Postgres instance (Neon) holds everything in v1, including listings, orders, deck definitions, audit log. Use Postgres full-text + facet indexes for search; defer dedicated search infra.
- **Consequences:** + Operational simplicity. + Strong consistency for money flows. − Search ceiling lower than a dedicated engine; revisit at ~50K listings. − Single-store coupling; resolvable later.
- **Alternatives considered:** Postgres + Elasticsearch (rejected: premature ops cost); Aurora (rejected: cost without benefit at this scale).

#### ADR-004 — Clerk for authentication

- **Status:** Accepted
- **Context:** Need fast multi-platform auth (email + social + magic link) with low backend burden. Buyer/seller/admin roles. REQ-010, REQ-011, REQ-022.
- **Decision:** Use Clerk on app + admin + API. Clerk holds users; our DB holds domain user_id keyed off Clerk user id. Admin MFA enforced via Clerk policy.
- **Consequences:** + Best-in-class native + web auth; CSRF/session pitfalls outsourced. − Vendor lock-in; mitigated by abstracting Clerk behind an `AuthAdapter`. − Price scales with MAU; acceptable at v1 volumes.
- **Alternatives considered:** Auth0 (rejected: weaker native DX); Supabase Auth (rejected: ties auth to a DB vendor we're not using); self-hosted (rejected: founder-stage scope).

#### ADR-005 — REST + Zod over GraphQL

- **Status:** Accepted
- **Context:** Single client, no third-party API consumers in v1. Strong shared-type story matters more than query flexibility.
- **Decision:** REST via Hono. Zod schemas describe request/response shapes, generate OpenAPI, and produce shared TS types for app/admin/server.
- **Consequences:** + Simpler tooling, easier caching, smaller server runtime. + No N+1 footgun. − Some endpoints will need bespoke shape for screens; manageable. − Migration to GraphQL later is doable if/when third parties need it.
- **Alternatives considered:** GraphQL (rejected: complexity tax without payoff at v1); tRPC (rejected: less integration-friendly for future third parties).

#### ADR-006 — Cloudflare R2 + Images for media

- **Status:** Accepted
- **Context:** Image-first product; egress-cost matters; need transform variants for thumbs, swipe card, full view; REQ-005, REQ-032.
- **Decision:** Direct-to-R2 signed-URL uploads; Cloudflare Images for transforms and CDN distribution.
- **Consequences:** + No egress fees; transforms at edge. − Single-vendor lock for media; portable in theory because R2 is S3-compatible.
- **Alternatives considered:** S3 + CloudFront + Lambda@Edge (rejected: more ops); imgix on S3 (rejected: cost).

#### ADR-007 — Hybrid escrow: held on platform, transferred on delivery confirmation

- **Status:** Accepted
- **Context:** PRD assumption A1: platform-escrow model. Need to protect buyers and meet PRD §5.4 expectations. REQ-014, REQ-016.
- **Decision:** Charge buyer with destination set to platform; capture immediately; transfer to seller on confirmed delivery (Shippo `delivered` event or buyer confirmation, whichever first). Disputes pause transfer.
- **Consequences:** + Buyer protection without writing custody-of-funds code. + Stripe handles the underlying money movement and 1099-K. − Requires careful state-machine design; covered by ADR-002's threshold watcher and invariant tests.
- **Alternatives considered:** Direct charge (rejected: buyer protection too weak); manual escrow (rejected: licensing/legal scope).

#### ADR-008 — bun workspace monorepo over polyrepo

- **Status:** Accepted
- **Context:** Three deployables (app, admin, server) + workers + shared types. Founder-stage, one team.
- **Decision:** Single monorepo using bun workspaces: `apps/app` (Expo), `apps/admin` (Vite), `apps/server` (Hono), `apps/workers`, `packages/shared`.
- **Consequences:** + Shared types and lint config; atomic refactors. − Build matrix grows; CI must run per-workspace. − Some Expo-specific quirks with bun (e.g., Metro config); mitigated by pinning known-good versions.
- **Alternatives considered:** Polyrepo (rejected: type-sharing pain); Turborepo on pnpm (rejected: user prefers bun).

### Open Items for Discovery

| Item | Question | Impact |
|---|---|---|
| GCD licensing & rate limits | Read-only license terms; mirror cadence; rate limits | If denied, need an alternate catalog source or to build a curated subset |
| Counterfeit/grading signal source | Use community reports + admin review only, or buy a signal feed? | M3 fraud module scope |
| Mediation staffing | Founder or contractor staffs dispute mediation? | M3 ops and runbook authors |
| Tax registration scope | Which states require sales tax registration before launch? | Counsel review; could constrain launch states |
| CCPA / state privacy DSAR responder | Founder-managed or service? | M3 compliance scope |
| Beta seller seeding | Source of the first 10 beta sellers? | M3 beta program scope |

### Technology Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GCD denies broad commercial use | Medium | High | Engage GCD early; design adapter to allow swapping to a curated internal catalog |
| Stripe Connect KYC threshold model rejected at scale | Low | High | Spec-confirmed with Stripe at v1; have a fallback "KYC at first listing" toggle ready |
| Expo Web parity gaps for swipe gestures | Medium | Medium | Ship web with documented degraded gesture path; reassess in M2 |
| Image storage costs spike with large libraries | Medium | Medium | Cloudflare Images plan; per-listing image cap (e.g., 8) |
| Vendor outage (Clerk, Stripe, Shippo) | Low | High | Status banners; idempotent webhook handlers; queued retries |
| App store policy rejection (marketplace + payments) | Medium | High | Use Stripe for goods (App Store policy carve-out for physical goods); submit early in M3 |
| Search ceiling on Postgres | Medium | Medium | Plan move to dedicated search at ~50K listings |
| Counterfeit / liability exposure | Medium | High | Clear ToS; takedown SLA; signal aggregation; insurance review |

### Technical Glossary (feeds Arc42 §12)

| Term | Definition |
|---|---|
| **SwipeDeck** | Client component that renders a stack of listing cards and exposes pan/throw gestures |
| **DeckSource** | Abstraction over the origin of a deck (filtered search vs editorial-published) |
| **AffinityStore** | Local-first store of like/pass/save state per user, synced to server |
| **PayoutStateMachine** | Worker that drives an order's funds through hold → ship → deliver → release → payout |
| **ThresholdWatcher** | Worker that monitors cumulative seller payouts and gates the next payout on KYC at the 1099-K threshold |
| **NotificationFanout** | Worker that dispatches a domain event to push + email + in-app inbox respecting user preferences |
| **DeckBuilder** | Admin tool for composing editorial decks |
| **ModerationQueue** | Admin surface for reviewing reported listings and users |
| **EAS** | Expo Application Services — managed native build + submission pipeline |
| **MADR** | Markdown Architectural Decision Record format used in §9 |
| **SAQ-A** | The narrowest PCI self-assessment questionnaire — applies when no card data touches our infra |
| **R2** | Cloudflare's S3-compatible object storage with zero egress fees |

---

## Estimation
_Completed: 2026-05-10_

### Method

Bottom-up estimate by deliverable group, person-weeks (PW). Each group is given a low (best case, no surprises), expected (typical), and high (significant surprises) bound, plus a confidence rating. AI leverage already baked in:
- **Heavy** deliverables sized at 30–40% of a traditional baseline.
- **Moderate** at 50–70%.
- **Minimal** at 80–100%.

Estimates assume the build team described in Phase 3 (Staffing): 2 senior full-stack engineers + a part-time designer + founder acting as PM/SME. Hours are loaded weeks (~30 productive engineering hours).

### Per-Milestone Estimates

#### Milestone 1 — Foundation

| Group | Low | Expected | High | Confidence | Key Risk |
|---|---|---|---|---|---|
| 1A Repo Scaffolding | 1.0 | 1.5 | 2.0 | High | Tooling compat surprises (Expo + bun) |
| 1B Backend Foundation | 4.0 | 5.5 | 7.0 | Medium | Auth + RBAC + image upload pipeline integration |
| 1C Integrations POC | 4.0 | 5.5 | 8.0 | Medium-Low | Stripe Connect onboarding nuances; GCD licensing path |
| 1D Cross-Cutting Foundation | 3.0 | 4.0 | 5.0 | High | Observability stack wiring |
| 1E App Shell | 3.0 | 4.0 | 5.5 | High | Design system completeness |
| **Subtotal M1** | **15.0** | **20.5** | **27.5** | — | — |

#### Milestone 2 — Marketplace Core

| Group | Low | Expected | High | Confidence | Key Risk |
|---|---|---|---|---|---|
| 2A Discovery Surface | 6.0 | 9.0 | 13.0 | Medium | Swipe perf on low-end Android; deck composition correctness |
| 2B Listings & Catalog | 5.0 | 7.0 | 9.5 | Medium-High | GCD adapter robustness; media UX edge cases |
| 2C Curation Surface | 3.0 | 4.0 | 5.5 | High | Admin UX scope creep |
| 2D Commerce & Fulfillment | 8.0 | 11.0 | 15.0 | Medium-Low | Payout state machine correctness; chargeback/refund edges |
| 2E Notifications & Engagement | 3.0 | 4.0 | 5.5 | High | Push opt-in flows on iOS |
| **Subtotal M2** | **25.0** | **35.0** | **48.5** | — | — |

#### Milestone 3 — Compliance & Launch

| Group | Low | Expected | High | Confidence | Key Risk |
|---|---|---|---|---|---|
| 3A Compliance & Trust | 5.0 | 7.5 | 10.5 | Medium-Low | KYC + tax registration scope; mediation flow correctness |
| 3B Admin Console | 5.0 | 7.0 | 9.5 | Medium | Admin UX scope; audit log discipline |
| 3C Quality, Performance & Launch | 6.0 | 9.0 | 13.5 | Medium-Low | Pen test findings; app store review turnarounds |
| **Subtotal M3** | **16.0** | **23.5** | **33.5** | — | — |

### Project Aggregate

| Bound | Person-Weeks |
|---|---|
| Low | 56.0 |
| Expected (sum of expecteds) | 79.0 |
| **Risk-weighted expected** (60% expected + 25% high + 15% low) | **85.4** |
| High | 109.5 |

### Calendar Translation

Assuming 2 senior FTEs + 0.4 designer + 0.3 PM (see Phase 3):

| Bound | Engineering PW | Calendar Weeks (2.0 eng FTE) | Months |
|---|---|---|---|
| Low | 56 | 28 | ~6.5 |
| Expected | 79 | 39.5 | ~9 |
| Risk-weighted expected | 85 | 42.5 | ~10 |
| High | 110 | 55 | ~12.5 |

> Calendar assumes parallel work where the dependency matrix allows. M1 is mostly serial (backend foundation gates app shell + integrations). M2 parallelizes 2A↔2B↔2D once 2B basics land. M3 parallelizes 3A↔3B with 3C closing.

### Confidence Drivers

| Driver | Effect |
|---|---|
| **Greenfield project** | Reduces brownfield archaeology cost but increases initial scaffolding uncertainty |
| **High AI leverage (Heavy/Moderate dominant)** | Brings expected ranges down 30–50% from traditional baselines |
| **Three external regulated integrations (Stripe, Shippo, Tax)** | Pushes M2/M3 high bounds; webhook + state-machine correctness is failure-prone |
| **App store review** | Hard-to-predict tail; baked into M3 high bound |
| **PRD assumptions A1/A2/A3 still pending founder confirmation** | If escrow or KYC model shifts, M2D/3A re-scope |

### Key Assumptions Driving Estimates

1. Tech stack as locked in Tech Spec (Expo / Hono / Neon / Stripe / Cloudflare) — no late pivots.
2. 2 senior full-stack engineers with React Native + Stripe experience. A less senior team would push expected toward high.
3. GCD licensing resolves without alternate catalog work; if it doesn't, add ~5 PW.
4. Beta cohort sourced by the founder; recruitment effort not in engineering PW.
5. No live auctions, in-house grading, social, or international — locked from PRD §5.4.
6. Pen test scheduled mid-M3, not at end, so remediation fits inside the bound.

---

## Staffing
_Completed: 2026-05-10_

### Q&A Log

No clarifying questions were required. Founder-led startup with US-only v1 scope; team-of-2 agentic engineering is the natural fit. Headless mode — assumptions logged below.

### Development Approach: Agentic Engineering

This project uses agentic development. Each engineer operates with AI agents as core tooling — not as a supplement. Engineers direct AI agents for code generation, test writing, refactoring, documentation, and boilerplate elimination, focusing their judgment on swipe-perf optimization, money-correctness in the payout state machine, vendor integrations, and quality validation.

The agentic advantage shows up as reduced total engineering effort (person-weeks), not a compressed calendar. The project timeline is driven by sequential dependencies that require wall-clock time regardless of development speed: vendor onboarding (Stripe Connect, Shippo, GCD), pen test windows, app store review, KYC and tax provider configuration, and founder/legal sign-offs.

### Team Structure

#### Shared Resources (Part-Time)

| Role | Allocation | Key Responsibilities | Phase Focus |
|------|-----------|----------------------|-------------|
| **Solution Architect / Tech Lead** | 20% | Technical direction, ADR ownership, swipe-perf and payout-state-machine reviews, security sign-off | Heavier in M1 + M3 |
| **Founder / Product + PM** | 50% | Roadmap, stakeholder comms, beta cohort recruiting, vendor relations (Stripe/Shippo/GCD/legal), risk tracking | All milestones |
| **UX/UI Designer** | 30% (M1) / 20% (M2) / 10% (M3) | Design system, swipe-card design, listing flow, admin UX | Front-loaded into M1–M2 |
| **Legal / Compliance Counsel** | As-needed, milestone-bounded | Marketplace facilitator scope, ToS, privacy, dispute appeals | M1 contract review; M3 launch readiness |

#### Development Team

| Team Member | Primary Focus | Tech Stack |
|---|---|---|
| **Agentic Engineer 1 — App + Discovery** | Expo client, swipe runtime, listings UI, buyer/seller flows | React Native, Expo, TanStack Query, Reanimated; AI-assisted |
| **Agentic Engineer 2 — Backend + Payments** | API, Postgres, Stripe Connect + escrow state machine, workers, integrations | Node/Hono, Drizzle, Postgres, BullMQ; AI-assisted |

> Both engineers are full-stack capable; the split reflects primary ownership, not exclusivity. Engineer 1 owns the client; Engineer 2 owns the payment/escrow correctness lane. Admin Console (M3) is split: Engineer 1 owns the moderation/deck-builder UI, Engineer 2 owns the financial-ops view.

### Timeline & Allocation

#### Milestone Calendar (Risk-Weighted Expected — 42 weeks)

| Milestone | Weeks | Duration | Engineering Intensity |
|-----------|-------|----------|----------------------|
| **M1 Foundation** | 1–12 | 12 weeks | High |
| **M2 Marketplace Core** | 13–30 | 18 weeks | Peak |
| **M3 Compliance & Launch** | 31–42 | 12 weeks | Tapering (engineers) / High (PM, legal) |
| **Total** | | **42 weeks** | |

#### Engineer Allocation by Phase

| Phase | Engineer 1 | Engineer 2 | Combined per Week | Phase Person-Weeks |
|-------|-----------|-----------|-------------------|-------------------|
| **M1 Foundation** (12 wks) | ~90% | ~95% | ~1.85 PW/wk | ~22.2 |
| **M2 Marketplace Core** (18 wks) | ~95% | ~95% | ~1.9 PW/wk | ~34.2 |
| **M3 Compliance & Launch** (12 wks) | ~80% | ~80% | ~1.6 PW/wk | ~19.2 |
| **Total** | **~36 PW** | **~40 PW** | | **~75.6 PW** |

> Engineer 2 runs slightly hotter than Engineer 1 in M1 (backend foundation gates everything) and parity through M2. M3 tapers as work shifts from code to validation/vendor/legal.

**Why allocation tapers in M3:** Work shifts from code generation (heavily agentic) to human-gated activities — pen test remediation, accessibility audit, app store submissions, stakeholder sign-off, KYC/tax provider configuration, beta cohort recruitment.

### Effort Summary by Role

| Role | Allocation | Weeks on Project | Person-Weeks |
|------|-----------|-----------------|--------------|
| **Solution Architect / Tech Lead** | 20% | 42 | ~8.4 |
| **Founder / Product + PM** | 50% | 42 | ~21.0 |
| **UX/UI Designer** | 30% / 20% / 10% (M1/M2/M3) | 42 | ~9.0 |
| **Legal / Compliance Counsel** | As-needed | — | ~1.5 |
| **Agentic Engineer 1** | Variable | 42 | ~36 |
| **Agentic Engineer 2** | Variable | 42 | ~40 |
| **Total project effort** | | | **~115.9 PW** |
| **Engineering only** | | | **~76 PW** |

### Milestone Estimates (Bottlenecks & Critical Paths)

#### M1 Foundation (Weeks 1–12)

| Deliverable Group | Bottleneck | Primary Team |
|---|---|---|
| 1A Repo Scaffolding | Expo + bun + EAS interop | Engineer 1 + Engineer 2 |
| 1B Backend Foundation | Auth + RBAC + schema modeling | Engineer 2 + Architect |
| 1C Integrations POC | Stripe Connect & GCD discovery + provisioning | Engineer 2 + Founder |
| 1D Cross-Cutting Foundation | Datadog + Sentry wiring | Engineer 2 |
| 1E App Shell | Design system completeness | Engineer 1 + Designer |

**Engineering effort: ~22 PW**

**Critical path:** Backend Foundation (1B) gates everything else. App Shell (1E) and Integration POCs (1C) parallelize once API surface stabilizes around week 5. GCD license discovery is on the founder; if it slips, the catalog adapter must mock.

#### M2 Marketplace Core (Weeks 13–30)

| Deliverable Group | Bottleneck | Primary Team |
|---|---|---|
| 2A Discovery Surface | Swipe perf on low-end Android; deck composition correctness | Engineer 1 + Architect |
| 2B Listings & Catalog | GCD adapter robustness; media UX | Engineer 1 + Engineer 2 |
| 2C Curation Surface | Admin UX scope | Engineer 1 + Designer |
| 2D Commerce & Fulfillment | Payout state machine correctness; webhook reliability | Engineer 2 + Architect |
| 2E Notifications & Engagement | Push opt-in (iOS) | Engineer 1 + Engineer 2 |

**Engineering effort: ~34 PW**

**Critical path:** 2D (Commerce & Fulfillment) is the longest lane and has the highest correctness bar. 2A and 2B run in parallel; 2D depends on 1C Stripe POC. 2C is light and runs late-M2. The payout state machine in 2D is the calendar pacer.

#### M3 Compliance & Launch (Weeks 31–42)

| Deliverable Group | Bottleneck | Primary Team |
|---|---|---|
| 3A Compliance & Trust | KYC config, tax registration, mediation flow | Engineer 2 + Founder + Legal |
| 3B Admin Console | Admin UX scope; audit log discipline | Engineer 1 + Engineer 2 |
| 3C Quality, Performance & Launch | Pen test remediation + app store review | Engineers + Architect |

**Engineering effort: ~19 PW**

**Critical path:** App store review window (~1–2 weeks) and pen test remediation gate Production deploy. Submit to App Store and Google Play in week 36 (mid-M3) so the review window doesn't run to the wire. Beta cohort starts week 38.

### Parallel Execution Map

```
Week:       1   3   5   7   9   11  13  15  17  19  21  23  25  27  29  31  33  35  37  39  41  42
            ────────────────────────────────────────────────────────────────────────────────────────

Milestone:  [========== M1 Foundation ==========][============ M2 Marketplace Core ============][===== M3 Compliance & Launch =====]
Billing:    ^Deposit                              ^M1 gate                                       ^M2 gate                          ^M3 gate

Architect    ████████████░░░░░░░░░░░░░░░░░░░░░░░░██░░░░░░░░░░██░░░░░░░░██░░░░░░░░██░░░░██████████████
             ^ ADRs, infra                                    ^ Payout SM ^ Perf ^ Pen test, launch readiness

Engineer 1   ██████████████████████████████████████████████████████████████████████████████░░░░░░░░░░░░
             ~~~~~~~~~~90%~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~95%~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ~~~~80%~~~~~~
             ^ Shell, design system                          ^ Swipe, listings, curation                   ^ Admin UI, a11y

Engineer 2   ████████████████████████████████████████████████████████████████████████████████░░░░░░░░░░░
             ~~~~~~~~~~95%~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~95%~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ~~~~80%~~~~~~
             ^ Backend, Stripe POC                           ^ Payout SM, shipping, webhooks               ^ KYC, tax, financial ops

Designer     ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████░░░░░░░░░░░░░░░░░░██░░░░░░░░░░░░░░
             ^ Design system, listing flow                       ^ Swipe-card polish, curation       ^ Admin UX

PM           ████████████████████████████████████████████████████████████████████████████████████████████
             ^ Roadmap, vendor outreach, beta seed, comms, risks

Legal        ░░░░██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██░░░░██
             ^ ToS draft                                                                              ^ Privacy, launch ready

Legend: █ = Active  ░ = On-call / low utilization  ^ = Key event
```

### Notes

#### Team Prerequisites
- Full-stack capability (TypeScript + React Native + Node) across both engineers
- One engineer with material Stripe Connect / marketplace payment experience (E2)
- One engineer with native mobile performance experience (E1)
- Agentic development proficiency is required, not optional
- Architect has prior marketplace + escrow experience

#### External Dependencies

| Dependency | Owner | Risk | Mitigation |
|---|---|---|---|
| Stripe Connect production approval | Founder | Medium | Apply in week 1; pre-empt with detailed app description |
| GCD license / data access agreement | Founder | High | Engage GCD in week 1; design adapter to allow fallback to curated internal catalog |
| Apple Developer + Google Play accounts | Founder | Low | Provision in week 1 |
| Carrier accounts (Shippo or EasyPost) | Founder | Low | Set up by week 8 |
| Tax provider (Stripe Tax) | Founder | Low | Activated alongside Stripe Connect |
| State sales tax registrations | Founder + Legal | Medium | Counsel scopes in M1; registrations during M2 |
| Pen test vendor | Founder | Medium | Book by week 25 to land mid-M3 |

#### Buffer Rationale
- 42-week calendar reflects the risk-weighted expected estimate (85 PW). Low scenario (56 PW) compresses to ~32 weeks; high (110 PW) stretches to ~55 weeks.
- Engineer tapering in M3 reflects the shift from code to validation/vendor/legal — engineers stay engaged for bug fixes and remediation but are no longer the bottleneck.
- Founder allocation runs hot throughout; vendor and legal coordination is the silent calendar killer for marketplaces.

#### Communication & Quality
- Daily standup: 15 min, async-first; synchronous if blocked
- Weekly planning + risk review with architect; biweekly stakeholder/investor update
- Code review: all code merged via PR; payment/escrow code reviewed by architect; admin/financial-ops code reviewed by both engineers
- Money-flow invariants covered by property-based tests; payout state machine covered by integration tests with Stripe sandbox events

### Staffing Assumptions

1. Two senior agentic engineers available full-time from week 1 — primary cost-driving assumption. Less senior team pushes effort toward high (~110 PW).
2. Founder runs PM/SME hat at ~50% allocation; not separately budgeted as a hire.
3. Designer is a 0.2–0.3 FTE contractor; no full-time hire needed in v1.
4. Legal is a billable retainer, not a hire.
5. No QA hire — engineers own automated coverage; founder + beta cohort own exploratory QA in M3.
6. No DevOps hire — Fly/Neon/Upstash/Cloudflare managed services keep ops load low enough for the engineering team.
7. App store accounts and developer entities exist by end of week 1.


---

## Architecture Validation
_Completed: 2026-05-10_

| # | Check | Severity | Item | Issue | Resolution |
|---|-------|----------|------|-------|------------|
| 1 | REQ-IDs in Appendix C match PRD §8.3 | Pass | — | All 37 REQ-IDs present in both | No action |
| 2 | Every Must-Have REQ-ID maps to a story | Pass | REQ-001 through REQ-013, REQ-020 through REQ-027, REQ-030 through REQ-035 | All Must-Haves traced | No action |
| 3 | No phantom REQ-IDs in architecture | Pass | — | Architecture REQ-ID set ≡ PRD REQ-ID set | No action |
| 4 | All 12 Arc42 sections present | Pass | §§ 1–12 | All populated | No action |
| 5 | §1.2 Quality Goals ≥3 entries | Pass | 5 quality goals | — | No action |
| 6 | §5 Building Blocks ≥1 unit | Pass | 11 units | — | No action |
| 7 | §6 Runtime View covers all Must-Have functional REQs | Pass | REQ-001–013 all referenced | — | No action |
| 8 | §9 ADRs ≥1 | Pass | 9 ADRs (ADR-001..009, sequential) | — | No action |
| 9 | §10 Quality Scenarios non-empty | Pass | 8 entries QS-001..QS-008 | — | No action |
| 10 | §12 Glossary non-empty | Pass | 23 entries | — | No action |
| 11 | Appendix A has stories for every §5 unit | Info → Fixed | U-Notifications | S-2.12 was grouped under U-Commerce-Fulfillment despite covering REQ-014/REQ-035 | Auto-fix: inserted `### Unit: U-Notifications` heading before S-2.12 |
| 12 | Appendix D timeline present | Pass | Milestone Calendar 42-week table | — | No action |
| 13 | ADR sequential numbering | Pass | ADR-001..009 no gaps | — | No action |
| 14 | Every ADR has Decision Outcome | Pass | All 9 ADRs have outcomes | — | No action |
| 15 | Tech stack in §8 matches §4 references | Pass | bun/Hono/Drizzle/Postgres/Neon/Redis/Upstash/BullMQ/Zod/Clerk/Cloudflare/R2/Fly.io/Stripe/Shippo/Postmark/Sentry/Datadog/PostHog/Expo all present in both | — | No action |
| 16 | §5.3 Build Order respects §5.4 Dependency Matrix | Pass | Foundation → Integrations → Listings → Discovery/Curation → Commerce → Notifications → Compliance → Admin → Quality | — | No action |

**Summary:** 16 checks run. 0 blockers. 0 warnings. 1 info-level auto-fix applied (U-Notifications unit heading added in Appendix A). 37/37 REQ-IDs fully traced. Architecture is structurally complete and Arc42 v8 compliant.
