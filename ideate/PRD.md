2026-05-10

Ideate Phase
Product Requirements Document
Sleeve (startup founder/team)

**Product Requirements Document: Sleeve — "An Infinite Longbox"**

## 1.0 Document Overview

| Field                          | Value           |
| :----------------------------- | :-------------- |
| **Version**                    | 1.0             |
| **Date**                       | 2026-05-10      |
| **Status**                     | Complete        |
| **Target Release / Milestone** | TBD (funding-driven; validation-milestone phased) |
| **Authors / Contributors**     | alxjrvs (founder), Claude (ideate pipeline) |
| **Project Type**               | Greenfield      |

## 2.0 Executive Summary

Sleeve ("An Infinite Longbox") is a mobile-first, Tinder-style swipe marketplace for rare comics. Sellers list back-issue and collectible comics; buyers discover them by swiping through filterable, curated and open-marketplace decks. The platform digitizes the experience of flipping through a longbox at a comic shop and pairs it with first-class mobile UX, a category eBay has neglected.

### 2.1 The Initiative

Build a two-sided marketplace where rare comic buyers and sellers transact via a swipe-driven discovery loop. The product is delivered via Expo (React Native + Web) so iOS, Android, and web share one codebase. v1 targets US-only fixed-price transactions, with live auctions, in-house grading, social features, and cross-border commerce explicitly deferred.

### 2.2 Vision & Scope

**Vision:** Make discovering rare comics feel like play, not search. Become the default marketplace for collectors who today grudgingly use eBay because nothing better exists.

**In scope for v1:**
- Swipe-driven discovery (the invariant core mechanic).
- Filters that narrow the swipe deck (series, era, character, grade band, price range, condition, etc.).
- Seller listing flow with seller-supplied photos and metadata.
- Buyer purchase flow (fixed price, single-item buy-now).
- Payments and shipping coordination (model to be selected — see open questions).
- Cross-platform delivery via Expo (iOS, Android, Web).
- Curated/featured decks layered over an open marketplace ("curator/marketplace hybrid").
- Basic seller trust signals (ratings or verification — model TBD).

**Out of scope for v1:**
- Live auctions / bidding.
- In-house grading or authentication services.
- Social features (follow graph, public feed, DMs).
- International / cross-border transactions.

### 2.3 Success Metrics

The first 6 months are validation-stage, not revenue-stage. GMV is deliberately not a launch metric.

- **Supply density**: active sellers and populated inventory sufficient that any filter combination returns a non-trivial swipe deck.
- **Engagement**: daily active buyers, swipes per session, session length, return rate.
- **Community traction**: comics-community press, influencer adoption, organic social mentions.

Detailed targets are deferred to Section 6.0.

## 3.0 Background & Strategic Fit

Rare comics today move through marketplaces never designed for the category. Buyers and sellers tolerate this because no dedicated alternative exists at meaningful scale. Sleeve's bet is that a mobile-first, swipe-driven discovery experience can pull buyers (and the sellers who follow them) out of these incumbent channels by making browsing materially more enjoyable than it is today.

### 3.1 Problem Statement

Rare and back-issue comics are an inherently visual category sold through interfaces optimized for text search and grid scanning. The act of flipping through a longbox — the joy of stumbling on a cover you didn't know you wanted — has no good digital analog. Existing channels each fail in specific ways:

- **eBay** has supply and trust but a 2005 desktop-feeling UX hostile to visual browsing.
- **Specialty dealer sites** (MyComicShop, Mile High) carry deep inventory but feel like e-commerce, not discovery.
- **Social channels** (Facebook groups, Instagram, Discord) feel native and visual but lack transactions, structure, or trust.
- **Live-auction apps** (Whatnot) are mobile and social but demand real-time attention.

Collectors put up with this because nothing better exists. Sellers — especially indie comic shops and pro/semi-pro dealers — list on eBay because that's where the buyers are, despite the experience.

### 3.2 Goal & Opportunity

The strategic opportunity is to capture the **visual-discovery wedge** of the rare comics market — the segment of buyers and sellers whose primary frustration is not price or selection but the act of browsing. The wedge is narrow on purpose: by refusing to be "eBay for everything," Sleeve can deliver a UX that eBay structurally cannot match, then expand from there.

**Strategic plays the wedge enables:**

1. **Brand-first launch**: a clean, beautiful swipe experience generates comics-community press and influencer adoption (one of the 6-month success metrics) far more readily than yet-another-marketplace.
2. **Sellers follow the buyers**: shop owners and dealers will list where engaged buyers are, even at lower take-rates than they're used to elsewhere. The curator/marketplace hybrid (Section 5.0) means Sleeve can launch with a small curated inventory while open-marketplace supply ramps.
3. **AI-assisted listing as a moat**: cataloging is the long-term technical linchpin. v1 ships with seller-supplied content, but catalog-assisted (GCD lookup) and AI-assisted (auto-detect from photo) listing flows are the path to listing speed sellers can't get elsewhere.
4. **Format adjacency**: the same swipe-discovery primitive extends to variants, signed editions, original art, conventions exclusives — categories underserved by general marketplaces and primed for niche curation.

The risk shape is product-market fit (will collectors actually adopt swipe-as-search?) and supply liquidity (does the deck stay fresh?). Both are validation-stage questions, and the success metrics are chosen to answer them before pushing on monetization.

### 3.3 Dependencies & Constraints

**Technical:**
- Expo (React Native + Web) — single codebase across iOS, Android, and Web.
- Mobile-first; web is a first-class output but not the primary target.
- Payment processing depends on selecting a transaction model (see Section 3.5 and 7.0).
- Image hosting and CDN for high-quality listing photos (swipe UX requires fast, sharp imagery).
- Comics metadata source for catalog-assisted listing (likely Grand Comics Database, GCD).

**Business:**
- Timeline is funding-driven, not date-driven. Scope ladders to validation milestones.
- US-only v1 — defers KYC, tax, and customs complexity from cross-border.
- No in-house grading — relies on seller-supplied grades and photos; introduces a trust/dispute surface that v1 must address minimally.

**Regulatory / compliance:**
- Marketplace payments — likely Stripe Connect or similar — bring KYC obligations on sellers above platform-set thresholds.
- Sales tax — marketplace facilitator obligations vary by state; the platform may be on the hook to collect/remit.
- Counterfeit / IP — rare comics market has known counterfeiting (especially around Golden Age keys); platform policy and takedown process must exist before launch.

### 3.4 Pain Points with Existing Systems

| Channel | Pain Point | Sleeve Response |
|---|---|---|
| eBay | Search-first UX; no visual browsing; desktop-shaped on mobile | Swipe-first discovery; mobile-native gestures |
| eBay | Listing flow is generic; comic-specific metadata is buried | Comics-aware listing fields (series, issue, variant, grade) with future catalog lookup |
| eBay | Generic feedback system; no comics-specific trust signal | Comics-relevant trust signals (verification, grade-accuracy tracking) |
| MyComicShop / dealer sites | Catalog-driven UX feels like 2005 e-commerce | Modern mobile-first UX; discovery as a feed, not a SKU lookup |
| Facebook / Instagram / Discord | No transactions, no escrow, no dispute path | First-party payments and dispute resolution |
| Facebook / Instagram / Discord | Listings disappear into feeds; no structure | Persistent listings, filterable inventory, want-lists (post-v1) |
| Whatnot | Auction format demands real-time attention | Asynchronous swipe-and-buy; come back when you want |

**Operational pain points sellers cite (synthesized from discovery):**
- Listing time per book on eBay is high — photos plus metadata plus shipping logistics.
- Comic-specific fields don't fit eBay's category templates well.
- Returns and counterfeits are a constant tax on dealer time.

### 3.5 Competitive Landscape

| Competitor | Strengths | Weaknesses | Gap Sleeve Exploits |
|---|---|---|---|
| **eBay** | Massive supply; trusted payments; broad buyer base | Search-driven; visually flat; mobile is a port of desktop; comics metadata is shallow | Visual-first, mobile-native discovery; comics-aware listing |
| **MyComicShop / Mile High** (specialty dealer sites) | Deep, structured catalog; trusted in collector circles; quality grading | Web-1.0 UX; not mobile-first; not social; not playful | Modern discovery UX; community feel; mobile gesture polish |
| **Facebook groups / Instagram / Discord** | Visual-native; community-driven; rapid feedback loops | No transactions; no escrow; no structure; trust depends on reputation alone | Real payments, structured listings, dispute resolution |
| **Whatnot** | Live, social, mobile-native; energetic | Live auctions demand real-time attention; not browse-friendly; not catalog-driven | Asynchronous browse-and-buy; persistent listings |
| **HipComic / ComicConnect / Heritage** (auction houses) | High-end keys; trusted grading | Auction-only; high-end-only; not for everyday collecting | Open marketplace at all price tiers; fixed price |

**Convergent table stakes** (must match incumbents):
- Trusted payments and dispute resolution.
- Listing photos with zoom; clear titles; price.
- Search and filter by series/issue/grade.
- Seller ratings or verification.

**Divergent differentiators** (Sleeve's specific bets):
- **Swipe-driven discovery** as the primary browsing mechanic.
- **Mobile-first** native gestures via Expo / React Native.
- **Curator/marketplace hybrid** — featured decks alongside open inventory.
- **Listing onramp** — eventual catalog and AI-assisted listing to compress seller effort.

**Strategic threats:**
- eBay or Whatnot could clone the swipe UI; speed-to-mindshare matters.
- A specialty dealer site (MyComicShop) could rebuild on modern stack; their catalog depth is real.
- Counterfeit and fake-grade listings can destroy trust fast in a curated environment.

## 4.0 Target Audience & Personas

Three personas span the four user types identified in discovery. They are not mutually exclusive — one person may act as more than one persona depending on session.

### Persona 1 — "The Hunter" (Serious Collector)

| Field | Detail |
|---|---|
| **Description** | A collector with a specific want-list: key issues, variants, signed editions, specific runs. Has been collecting for 10+ years; spends $200–$2000/month. Active on multiple existing channels (eBay, Facebook groups, Heritage). |
| **Goals** | Find specific issues at fair prices. Trust the grading. Build out runs efficiently. Get alerted when a wanted issue surfaces. |
| **Pain points** | eBay's UX makes browsing tedious; misgrades on Facebook groups burn time and money; auction-only sites lock out the buy-now mindset. |
| **What Sleeve delivers** | Filterable swipe deck for fast hunt sessions; want-lists (Should-Have, REQ-015); verified-seller signal (REQ-009); structured dispute path for grade misrepresentation (REQ-011). |
| **What earns their adoption** | Supply density in their niche + verified-seller credibility. They will validate quickly whether the platform is worth their time. |

### Persona 2 — "The Browser" (Casual / Nostalgia Buyer)

| Field | Detail |
|---|---|
| **Description** | Reconnecting with childhood favorites or following a creator they like. Spends $20–$150/month, in bursts. Not actively hunting — discovery-driven. |
| **Goals** | Enjoy browsing comics again. Stumble onto interesting issues without effort. Buy on impulse without a complicated checkout. |
| **Pain points** | eBay search requires knowing what you want; specialty dealer sites are intimidating; no platform makes browsing actually fun. |
| **What Sleeve delivers** | Swipe-driven discovery (REQ-001) — the core mechanic is built for this persona. Curated decks (REQ-003) lower the barrier to "what should I look at?". 2-tap purchase (REQ-005). |
| **What earns their adoption** | The swipe loop has to feel good. Press / influencer-driven discovery (one of the 6-month metrics) is how this persona finds the app. |

### Persona 3 — "The Operator" (LCS Owner or Pro/Semi-Pro Dealer)

| Field | Detail |
|---|---|
| **Description** | A comic shop owner or full/part-time dealer with hundreds-to-thousands of back-issue SKUs. Already listing on eBay; tired of fees, listing time, and disputes. |
| **Goals** | Move inventory faster. Spend less time per listing. Build a reputation that compounds. Reach buyers eBay's UX hides. |
| **Pain points** | Listing time on eBay is high; comics metadata doesn't map cleanly to eBay categories; chargebacks and return abuse; algorithm changes that surface lower-quality listings over theirs. |
| **What Sleeve delivers** | Fast listing flow with seller-supplied → catalog → AI onramp (REQ-004, REQ-016, REQ-019); seller dashboard (REQ-017); verified-tier as a visible quality signal (REQ-009); first-party dispute resolution (REQ-011). |
| **What earns their adoption** | Buyer engagement first. They will list where the buyers are. The brand-led launch (curated decks, press) is the unlock for this persona. |

### 4.1 User Stories

Detailed acceptance criteria for the stories below live with each requirement in §5.1.

**Hunter** (Persona 1)
- As a Hunter, I want to filter the swipe deck to a specific series and grade band so I focus my session on hunting Bronze Age keys. (REQ-002)
- As a Hunter, I want to save a filter combination as a want-list and be notified when a match is listed so I never miss a target issue. (REQ-015)
- As a Hunter, I want to see verified-seller status before buying high-value issues so I weight the risk consciously. (REQ-009)
- As a Hunter, I want to file a claim with evidence when a comic arrives misgraded so I'm protected. (REQ-011)

**Browser** (Persona 2)
- As a Browser, I want to open the app and immediately have something interesting to look at so it feels like play. (REQ-001, REQ-003)
- As a Browser, I want curated decks I can tap into so I don't have to know what I'm looking for. (REQ-003)
- As a Browser, I want to buy a comic in 2 taps with my saved card so I act on impulse. (REQ-005)
- As a Browser, I want push notifications when a comic I bought ships so I anticipate its arrival. (REQ-014)

**Operator** (Persona 3)
- As an Operator, I want to list a comic in under 2 minutes from my phone so I can clear stock during downtime. (REQ-004)
- As an Operator, I want to look up an issue in a catalog so the metadata is correct and I save time. (REQ-016)
- As an Operator, I want a dashboard showing payouts, GMV, and active listings so I track performance. (REQ-017)
- As an Operator, I want my verified-seller badge to appear on every listing so the trust I've built pays off. (REQ-009, REQ-010)

## 5.0 Key Features & Requirements

### 5.1 Functional Requirements

| REQ-ID | Requirement | User Story | Acceptance Criteria (Given/When/Then) | MoSCoW |
|---|---|---|---|---|
| **REQ-001** | **Swipe-driven discovery feed** — primary browsing interface; horizontal swipe (left = skip, right = like/save, tap = detail). | As a buyer, I want to swipe through listings so that discovery feels playful rather than search-driven. | Given an authenticated buyer with at least one feed-eligible listing, when they open the app, then a stack of listing cards is rendered and swipe gestures advance the deck at 60fps on a mid-tier 2023 phone. | Must |
| **REQ-002** | **Filter system over the swipe deck** — narrow the deck by series, era, character, grade band, price range, condition, seller, and curated-deck membership. Filters are persistent within a session and resumable. | As a buyer, I want filters that narrow what I'm swiping so I can hunt specific niches without giving up the swipe UX. | Given a buyer applies any filter combination, when the swipe deck reloads, then only listings matching the filter are queued; the buyer can reset filters in one action. | Must |
| **REQ-003** | **Curated/featured decks** — editorially or algorithmically selected listing collections (e.g., "Bronze Age Keys", "$50 and Under"). Decks appear alongside the open marketplace. | As a buyer, I want to swipe through hand-picked decks so I can lean on curation when I don't know what I want. | Given at least one curated deck exists, when a buyer opens the app, then curated decks are surfaced on the home screen and tapping one enters a swipe session scoped to that deck. | Must |
| **REQ-004** | **Seller listing creation** — sellers create a listing by uploading photos (front/back minimum), entering metadata (series, issue number, variant, grade, condition notes, price), and publishing. | As a seller, I want to list a comic from my phone in under 2 minutes so I can move inventory without dedicating a desktop session. | Given a verified seller, when they complete the listing form with valid required fields, then the listing is published to the open marketplace within 30 seconds and is filter-eligible. | Must |
| **REQ-005** | **Buyer purchase flow (fixed price, single-item)** — tap-to-buy from a card detail view; complete checkout with saved payment method. | As a buyer, I want to complete a purchase in 2 taps once payment is on file so I act on impulse-discovery. | Given a buyer with a saved payment method, when they tap "Buy" on a listing detail, then a confirmation sheet appears and confirming charges the buyer and reserves the listing within 5 seconds. | Must |
| **REQ-006** | **Payment processing via marketplace processor** — platform-escrow model (assumed): payment captured at purchase, held until buyer confirms receipt or auto-release window expires. (Open: see audit assumption A1.) | As a buyer, I want my money held until I receive the comic so I'm protected from non-delivery. | Given a buyer pays for a listing, when the seller marks it shipped and the buyer confirms receipt (or 7-day auto-release elapses post-delivery), then funds release to the seller minus platform fees. | Must |
| **REQ-007** | **Shipping coordination** — sellers purchase or upload a tracking number; buyers see tracking; status drives the escrow release window. Initial scope: seller-fulfilled with platform-purchased labels (via a shipping aggregator). | As a seller, I want to buy and print a label inside the app so I don't context-switch to USPS or a carrier site. | Given a paid order, when the seller initiates "Ship Now", then the app offers carrier/service options with rates and produces a printable label upon purchase; tracking number is attached to the order automatically. | Must |
| **REQ-008** | **User accounts with dual buyer/seller modes** — single account toggles between buyer and seller views; the same person can list and buy. | As a collector who occasionally sells, I want one account so I don't manage two identities. | Given an authenticated user, when they switch to seller mode, then seller-specific views (listings dashboard, orders to fulfill) become available without re-login. | Must |
| **REQ-009** | **Seller trust signals — tiered (open + verified badge)** — anyone can list; verified sellers display a badge after identity + selling history checks. (Open: see audit assumption A2.) | As a buyer, I want to see verified-seller status so I can weight my risk on higher-value purchases. | Given a seller has completed verification (KYC + 5 completed sales with no chargebacks), when their listings appear in any feed, then a verified badge is rendered on the card. | Must |
| **REQ-010** | **Buyer ratings of sellers** — post-transaction rating (1–5 stars + optional written review) on grade accuracy, packaging, and speed. | As a buyer, I want to rate the seller so future buyers benefit from my experience. | Given a completed transaction (funds released), when 24h elapse, then the buyer is prompted to rate; rating posts to the seller profile and contributes to the verified-tier eligibility calculation. | Must |
| **REQ-011** | **Dispute / claim flow** — buyer can file a claim within the escrow window for non-delivery, misgrade, or counterfeit. Platform mediates; funds remain in escrow during review. | As a buyer, I want a clear claim path when a comic arrives misgraded so I'm not stranded with a bad book. | Given a buyer in the escrow window, when they file a claim with evidence (photos, description), then funds freeze, the seller is notified with a response SLA, and platform mediation resolves within 7 business days. | Must |
| **REQ-012** | **Cross-platform delivery — iOS, Android, Web via Expo** — single codebase; mobile is primary; web is a first-class output. | As a user, I want to use Sleeve on whichever device is convenient so my choice of platform isn't a constraint. | Given any supported platform (iOS 16+, Android 10+, modern web browser), when the user signs in, then they access the full feature set with platform-appropriate gestures (touch swipe on mobile, click/drag on web). | Must |
| **REQ-013** | **Authentication — email + phone** — sign-up and sign-in with email and phone; SMS or magic-link OTP for verification. KYC layered on top for seller verification. | As a user, I want a quick sign-in so I'm not deterred at the front door. | Given a new user, when they enter their phone or email, then they receive an OTP and complete sign-up within 90 seconds without additional friction (KYC happens later, at seller-verification step). | Must |
| **REQ-014** | **Push and email notifications** — order paid, shipped, delivered, rated; claims filed/resolved; new listings matching saved filters (post-launch). | As a seller, I want push notifications when a comic sells so I can ship fast and protect my rating. | Given a user opted in to notifications, when a transactional event occurs (paid, shipped, delivered, claim opened), then a push notification is delivered within 30 seconds; email is sent in parallel for durability. | Should |
| **REQ-015** | **Want-lists and saved filter alerts** — buyers save a filter combination; receive alerts when new listings match. | As a buyer hunting a specific variant, I want alerts so I don't miss listings that match my hunt. | Given a buyer saves a filter combination as a want-list, when a new listing matches, then a notification is queued and delivered within 5 minutes. | Should |
| **REQ-016** | **Catalog-assisted listing — GCD or equivalent lookup** — sellers search a comics database while listing; selecting a known issue pre-fills series, issue number, variant, and cover thumbnail. | As a seller, I want metadata auto-populated from a known catalog so I cut listing time in half. | Given a seller in the listing flow, when they search and select a catalog match, then the listing form is pre-populated with verified metadata and a cover reference image. | Should |
| **REQ-017** | **Seller dashboard — inventory and sales analytics** — list active/sold/pending; view sales volume, GMV, average sale price, payout history. | As a seller, I want a dashboard so I can manage inventory and track performance without exporting data. | Given a seller with completed sales, when they open the dashboard, then they see active and sold listings, payout balance, and trailing-30-day sales metrics. | Should |
| **REQ-018** | **Recommendation engine driven by swipe behavior** — like/skip signals personalize the feed and surface affinity-matched curated decks. | As a buyer, I want the feed to learn what I like so I see more relevant comics over time. | Given a buyer with ≥50 swipe interactions, when they open the feed, then ≥40% of cards in the top of the deck are affinity-matched (measured against a control buyer with no signal). | Could |
| **REQ-019** | **AI-assisted listing — photo-to-issue auto-detect** — seller takes a photo; ML predicts series, issue, and variant; seller confirms or corrects. | As a seller, I want my camera to do the cataloging so listing approaches single-tap. | Given a seller in the listing flow with camera enabled, when they capture a cover photo, then the system returns top-3 catalog predictions with ≥80% top-1 accuracy on a benchmark set. | Could |

### 5.2 Non-Functional Requirements

| REQ-ID | Requirement | Measurement Method | Target Value | MoSCoW |
|---|---|---|---|---|
| **REQ-020** | **Swipe gesture performance** — the swipe deck must feel native on mobile. | Frame rate during swipe gesture, measured on iPhone 13 / Pixel 6 baseline devices. | ≥60fps sustained, ≥58fps p95 across a 100-card session. | Must |
| **REQ-021** | **Image load latency in deck** — preload the next N cards (N≥3) to keep the deck visually populated. | Time from "card index advances" to "next card image fully rendered" on Wi-Fi and LTE. | <100ms on Wi-Fi; <300ms p95 on LTE; no visible spinner while the user is actively swiping (≥1 swipe per 2 seconds). | Must |
| **REQ-022** | **Payment & transaction durability** — order state and funds-holding must survive crashes and provider outages. | Order-state recovery tests; payment provider webhook idempotency tests. | Zero lost orders or double-charges over 10,000 simulated transactions. | Must |
| **REQ-023** | **PCI compliance via processor** — never store raw card data on platform infrastructure. | PCI SAQ-A scope, verified by integration pattern (tokenization-only with Stripe or equivalent). | SAQ-A scope; no PAN, CVV, or expiry stored or logged on Sleeve systems. | Must |
| **REQ-024** | **Marketplace KYC for high-volume sellers** — gate KYC at the IRS 1099-K threshold ($600 gross in a calendar year, US) and verified-tier qualification. | Threshold trigger logs; Stripe Connect (or equivalent) KYC completion events. | 100% of sellers crossing threshold either complete KYC or are payout-blocked. | Must |
| **REQ-025** | **Sales tax — US marketplace facilitator compliance** — calculate, collect, and remit sales tax in all states with marketplace facilitator laws. | Integration with a tax-calc provider (TaxJar, Avalara) + remittance audit trail. | 100% of taxable transactions in covered states include correct tax at checkout. | Must |
| **REQ-026** | **Counterfeit / IP takedown process** — defined policy and tooling to suspend listings, freeze funds, and respond to verified counterfeit reports. | Time from verified report to listing takedown; escalation rate. | <24h takedown SLA for verified reports; documented appeal path. | Must |
| **REQ-027** | **Accessibility — WCAG 2.1 AA** — core flows (browse, list, buy, account) meet AA. | Automated axe scan + manual screen-reader pass on each release. | Zero AA-level violations on core flows. | Must |
| **REQ-028** | **Reliability — service availability** — public API and app surfaces. | Monthly synthetic uptime monitoring. | 99.5% availability v1; 99.9% within first year post-launch. | Should |
| **REQ-029** | **Observability — error tracking and product analytics** — capture crashes, errors, and product events. | Crash-free session rate; event-pipeline completeness. | ≥99.5% crash-free sessions; ≤0.1% event loss. | Should |

### 5.3 Key Integrations

| REQ-ID | System | Purpose | Interface | Constraints / Notes | MoSCoW |
|---|---|---|---|---|---|
| **REQ-030** | **Stripe Connect** (assumed; see audit A1) | Marketplace payments, payouts, KYC | API + webhooks | Connect Express recommended for v1; supports US-only, multi-currency optional later. | Must |
| **REQ-031** | **Shipping aggregator** (Shippo or EasyPost) | Label purchase, tracking, rate quotes | API | Carrier accounts brokered through aggregator; tracking webhooks drive escrow state. | Must |
| **REQ-032** | **Image CDN** (Cloudinary, ImageKit, or self-hosted on Cloudflare R2 + Images) | Listing photo hosting, on-the-fly transformations, swipe-deck preload | SDK + URL-based transforms | Variants per device size; aggressive caching; sane defaults for compression. | Must |
| **REQ-033** | **Auth provider** (Clerk, Supabase Auth, or Auth0) | OTP-based sign-in, session management, social login | SDK | Phone OTP is critical (collector demographic skews high-trust, low-password-tolerance). | Must |
| **REQ-034** | **Tax-calculation provider** (TaxJar or Avalara) | Marketplace facilitator sales tax | API | Real-time calc at checkout; nightly remittance reports. | Must |
| **REQ-035** | **Notification provider** (Resend / SendGrid for email; Twilio / OneSignal for SMS/push) | Transactional notifications | API + webhook delivery events | Templates owned in provider for non-engineering edits. | Must |
| **REQ-036** | **Comics metadata source** (Grand Comics Database or similar) | Catalog-assisted listing | API or licensed data dump | Licensing terms must permit commercial use; data freshness matters less than coverage. | Should |
| **REQ-037** | **Product analytics** (Amplitude / Mixpanel / PostHog) | Engagement metrics (swipes, sessions, retention) — measures 6-month success metrics | SDK | Must support event taxonomy aligned to PRD section 6.1. | Should |

### 5.4 Out of Scope (v1)

| Item | Rationale | Reconsideration Trigger |
|---|---|---|
| **Live auctions / bidding** | Whatnot owns the live-auction mindshare; Sleeve's bet is asynchronous browse-and-buy. Different UX, different operational complexity. | Once browse-and-buy is validated and supply is liquid, evaluate live auctions as a format extension. |
| **In-house grading or authentication** | Operational moat takes years to build (CGC, CBCS). v1 relies on seller-supplied grades and dispute resolution. | If counterfeit/misgrade dispute rate exceeds 2% of completed transactions, revisit. |
| **Social features — follow, public feed, DMs** | Out of scope by founder direction. Discovery loop is the brand; social graph dilutes focus. | Re-evaluate post-PMF; consider seller-storefront and buyer-collection features ahead of social graph. |
| **International / cross-border transactions** | KYC, tax, customs, currency complexity. US-only v1. | Expand to Canada first (low complexity delta) once US ops are steady-state. |
| **Multi-currency** | Implied by US-only constraint. | Driven by international expansion. |
| **Consignment / fulfillment-by-Sleeve** | Capital-intensive (warehouse, staff, insurance). Out-of-scope per discovery transaction-model evaluation. | Re-evaluate when high-end ($1k+) listings become >10% of GMV. |
| **Trade / swap mechanics** | No transaction-revenue model; complicates dispute and tax handling. | Speculative; defer indefinitely. |
| **NFT or digital comics** | Not part of the rare-comics buyer/seller behavior loop. | Out of brand scope. |
| **Native desktop applications** | Web (via Expo) is the desktop surface. | None planned. |

## 6.0 Verification & Validation

### 6.1 Outcome Metrics

Validation-stage metrics for the first 6 months post-launch. GMV is deliberately excluded — included as a secondary metric in months 7–12.

| Outcome | Metric | Measurement Method | 6-Month Target |
|---|---|---|---|
| Supply density | Active sellers (≥1 listing in last 30 days) | Database query | ≥250 active sellers |
| Supply density | Active listings | Database query | ≥10,000 active listings |
| Supply density | Filter-coverage — % of common filter combos returning ≥20 results | Synthetic queries over top-50 filter combos | ≥80% of common combos return ≥20 results |
| Engagement | Daily active buyers | Product analytics | ≥2,000 DAU |
| Engagement | Median swipes per session | Product analytics | ≥40 swipes |
| Engagement | Median session length | Product analytics | ≥6 minutes |
| Engagement | 28-day buyer retention | Product analytics | ≥30% |
| Brand / community | Press / influencer mentions | Manual tracking | ≥10 substantive mentions in collector media |
| Brand / community | App store rating | App Store + Play Store | ≥4.5 on both stores |

**Secondary metrics tracked but not gated** (months 7–12):
- GMV
- Take rate / unit economics
- Verified seller share of GMV
- Dispute rate (target: <2% of completed transactions)
- Average time-to-list per seller

### 6.2 Acceptance Criteria

The project is "done v1" when:

1. **The buy/sell loop is functional end-to-end** on iOS, Android, and Web for US users: a buyer can find a listing via swipe + filters, purchase it, receive it, rate it, or file a claim — and a seller can list, fulfill, get paid out, and respond to a claim.
2. **All Must-Have requirements (REQ-001 through REQ-013, REQ-020 through REQ-027, REQ-030 through REQ-035) have passing acceptance criteria** verified against their measurement methods.
3. **The platform is launch-legal**: PCI SAQ-A scope confirmed, marketplace facilitator sales tax operational in covered states, KYC operational for sellers crossing threshold, counterfeit takedown process documented with SLA.
4. **Performance baselines are met**: 60fps swipe on reference devices (REQ-020); deck preload latency targets (REQ-021).
5. **At least one curated deck has been launched** to validate the curator/marketplace hybrid mechanic (REQ-003).
6. **Observability and product analytics are wired up** to actually measure §6.1 outcomes (REQ-029, REQ-037).

## 7.0 Risks, Assumptions, & Mitigations

Risk score = Impact (1–5) × Likelihood (1–5).

### 7.1 Product / Market Risks

| Risk | Impact (1-5) | Likelihood (1-5) | Score | Mitigation |
|---|---|---|---|---|
| **Swipe-as-search doesn't work for Hunters.** Serious collectors may bounce off the deck UX in favor of search-driven channels. | 5 | 3 | 15 | Filters (REQ-002) and want-lists (REQ-015) give Hunters a directed mode within the deck UX. Measure via Hunter cohort retention vs. Browser cohort. If Hunter retention is <50% of Browser at 3 months, add a search-first mode as fallback. |
| **Supply liquidity stalls.** Curated decks launch fine, but the open-marketplace deck stays sparse, breaking the discovery promise. | 5 | 4 | 20 | Curator/marketplace hybrid (REQ-003) means launching with hand-picked supply is acceptable. Filter-coverage metric (§6.1) is the early-warning indicator. Operator-persona acquisition push (LCS partnerships) is the main lever. |
| **Cloneability — eBay or Whatnot ships a swipe UI.** The core mechanic is replicable in months. | 4 | 3 | 12 | Comics-specific depth (catalog-assisted listing, dispute flow tuned to misgrade, verified-tier signal) is the moat. Speed-to-mindshare matters: brand-led launch with comics-community press is part of the strategy. |
| **Counterfeits and misgrades destroy buyer trust.** A swipe UX commits buyers fast; bad listings hurt more than they would on eBay. | 5 | 3 | 15 | Verified-seller tier (REQ-009), buyer ratings (REQ-010), dispute flow (REQ-011), takedown SLA (REQ-026). Soft launch with curated supply only; widen open marketplace as dispute rate is monitored. |

### 7.2 Operational Risks

| Risk | Impact (1-5) | Likelihood (1-5) | Score | Mitigation |
|---|---|---|---|---|
| **Dispute mediation overwhelms support headcount.** 7-day SLA on claims (REQ-011) requires real staffing. | 4 | 3 | 12 | Cap initial open-marketplace supply; lean on verified-tier sellers (lower dispute rate); document escalation playbook. Staffing plan addressed in Architecture phase. |
| **Sales-tax compliance gap.** Marketplace facilitator obligations vary by state and change. | 4 | 2 | 8 | Outsource to TaxJar/Avalara (REQ-034). Legal review at launch and quarterly. |
| **KYC friction blocks seller growth.** Stripe Connect KYC at the $600 threshold creates a real onboarding step. | 3 | 4 | 12 | Defer KYC until the threshold or verified-tier qualification (REQ-024). Communicate clearly when triggered. |
| **CCPA / state privacy law exposure.** US-only doesn't exclude California residents. | 3 | 3 | 9 | Standard CCPA compliance baseline (privacy policy, data subject rights, opt-out for sale of data even though no sale planned). Legal review. |

### 7.3 Technical Risks

| Risk | Impact (1-5) | Likelihood (1-5) | Score | Mitigation |
|---|---|---|---|---|
| **60fps swipe + web target is hard.** React Native + Web (Expo) must hit 60fps on mobile and feel responsive on web. | 4 | 3 | 12 | Use Reanimated for gesture-driven animations on mobile; lower targets for web (40fps acceptable since web is secondary). Benchmark early; budget time for optimization. |
| **Image pipeline cost.** High-quality photo loading at swipe-deck pace can be CDN-cost-heavy. | 3 | 3 | 9 | Aggressive variant sizing per device; on-the-fly compression; cache TTL tuned to listing churn rate. |
| **Comics metadata licensing.** GCD's commercial-use terms must be verified before launch. | 4 | 3 | 12 | Architecture phase confirms licensing or identifies alternatives (e.g., League of Comic Geeks API, internal catalog). |
| **Counterfeit detection automation.** Manual takedown won't scale past a certain listing volume. | 3 | 2 | 6 | Manual-first v1 is acceptable. ML-assisted detection enters roadmap once volume justifies investment. |

### 7.4 Strategic Assumptions

The assumptions made during requirements (audit A1–A10) are the load-bearing strategic decisions for v1. If any of these change in founder review or architecture, requirements should be revisited:

- **A1 — Platform escrow** (vs. direct payment or fulfillment-by-Sleeve). Affects REQ-006, REQ-030, dispute flow, capital requirements.
- **A2 — Tiered open + verified trust model** (vs. fully vetted gatekeeper). Affects REQ-009 and brand positioning.
- **A4 — US-only v1** (already explicit, but worth flagging: any cross-border push reshapes KYC, tax, currency, shipping).
- **A6 — Editorial-first curation** (vs. algorithmic). Affects REQ-003 and brand voice.

## 8.0 Appendix

### 8.1 Glossary

| Term | Definition |
|---|---|
| **Back issue** | A comic issue no longer in current print release; the secondary-market category Sleeve serves. |
| **CGC / CBCS** | Major third-party grading services that encapsulate comics in tamper-evident slabs with a numeric grade (1.0–10.0). |
| **Curated deck** | A swipe-able collection of listings selected editorially (v1) or algorithmically (post-PMF). Sits alongside the open marketplace. |
| **Deck** | The stack of listing cards a user is currently swiping through. May be the open marketplace, a curated deck, or a filtered subset. |
| **GCD (Grand Comics Database)** | Volunteer-maintained, freely-accessible comics metadata source — likely catalog backbone for REQ-016. |
| **Grade** | A numeric or descriptive measure of a comic's condition (e.g., 9.8 "Near Mint/Mint", VF "Very Fine"). Critical to value and a common dispute vector. |
| **Key issue** | A first appearance, origin issue, or other historically significant book. Outsized share of rare-comics value. |
| **KYC (Know Your Customer)** | Identity verification required for marketplace payouts above thresholds (e.g., US 1099-K $600). |
| **LCS (Local Comic Shop)** | Brick-and-mortar comic retailer. Many list back-issue inventory online. |
| **Longbox** | The standard cardboard storage box for comics (~300 issues). The product's name "An Infinite Longbox" evokes the experience of flipping through one. |
| **Marketplace facilitator** | US sales-tax classification that puts the platform on the hook to collect/remit tax on behalf of sellers in covered states. |
| **MoSCoW** | Prioritization framework: Must-Have, Should-Have, Could-Have, Won't-Have. |
| **Open marketplace** | All listings, browsable via swipe + filters. Counterpart to curated decks in the hybrid model. |
| **PCI SAQ-A** | Lowest-scope PCI compliance category — applies when card data is fully outsourced to a tokenized processor. |
| **REQ-NNN** | Unique requirement identifier used throughout the PRD for traceability to architecture and stories. |
| **Stripe Connect** | Stripe's marketplace product, supporting multi-party payments with platform fees and seller payouts. |
| **Swipe deck** | Synonym for "deck" — the stack of listing cards being browsed. |
| **Variant** | An alternate cover of the same issue. Variants carry independent collector value. |
| **Verified-tier seller** | A seller who has passed identity verification (KYC) and accumulated a clean sales record. Displays a badge (REQ-009). |
| **Want-list** | A saved filter combination (REQ-015) that triggers notifications when new listings match. |
| **Whatnot** | Live-auction mobile app with significant comics activity. Adjacent competitor (REQ context — auctions are out of v1 scope). |

### 8.2 References

This PRD was produced via the `/ideate:prd` pipeline. No external transcripts, market research, or design documents were provided as input.

| Source | Type | Used By |
|---|---|---|
| `ideate/prd-audit.md` § Discovery | Synthesized discovery Q&A (no-source path) | All sections |
| `ideate/prd-audit.md` § Competitors | Competitive landscape working notes | §3.0, §3.1, §3.5 |
| `ideate/prd-audit.md` § Knowledge | Operational and domain knowledge | §3.1, §3.4 |
| `ideate/prd-audit.md` § Opportunity | Strategic opportunity framing | §3.2, §2.0 |
| `ideate/prd-audit.md` § Requirements | MoSCoW + assumptions log (A1–A10) | §5.1–§5.4, §8.3 |
| `ideate/prd-audit.md` § Requirements Validation | ISO 29148 §6.4 validation findings | Resolved REQ-021 wording |

**Downstream consumers:**
- `/ideate:architecture` reads §3, §5, §6, §7, §8.3 to produce `architecture.md` with milestones, technical specifications, and (since this is greenfield) staffing.
- `/ignite:kickoff` reads §5.1–§5.4 and milestone structure to produce GitHub issues, milestones, and a project board. Greenfield flag (PRD §1.0) means a foundational story will be created.

### 8.3 Requirements Traceability

| REQ-ID | Description | Priority | Section |
|---|---|---|---|
| REQ-001 | Swipe-driven discovery feed | Must | 5.1 |
| REQ-002 | Filter system over the swipe deck | Must | 5.1 |
| REQ-003 | Curated / featured decks | Must | 5.1 |
| REQ-004 | Seller listing creation | Must | 5.1 |
| REQ-005 | Buyer purchase flow (fixed price) | Must | 5.1 |
| REQ-006 | Payment processing (platform-escrow) | Must | 5.1 |
| REQ-007 | Shipping coordination | Must | 5.1 |
| REQ-008 | User accounts (dual buyer/seller mode) | Must | 5.1 |
| REQ-009 | Seller trust signals (tiered open + verified) | Must | 5.1 |
| REQ-010 | Buyer ratings of sellers | Must | 5.1 |
| REQ-011 | Dispute / claim flow | Must | 5.1 |
| REQ-012 | Cross-platform delivery (iOS/Android/Web via Expo) | Must | 5.1 |
| REQ-013 | Authentication — email + phone OTP | Must | 5.1 |
| REQ-014 | Push & email notifications | Should | 5.1 |
| REQ-015 | Want-lists & saved filter alerts | Should | 5.1 |
| REQ-016 | Catalog-assisted listing (GCD lookup) | Should | 5.1 |
| REQ-017 | Seller dashboard | Should | 5.1 |
| REQ-018 | Recommendation engine (swipe-driven) | Could | 5.1 |
| REQ-019 | AI-assisted listing (photo auto-detect) | Could | 5.1 |
| REQ-020 | Swipe gesture performance (60fps) | Must | 5.2 |
| REQ-021 | Image load latency in deck | Must | 5.2 |
| REQ-022 | Payment & transaction durability | Must | 5.2 |
| REQ-023 | PCI compliance via processor (SAQ-A) | Must | 5.2 |
| REQ-024 | KYC for high-volume sellers | Must | 5.2 |
| REQ-025 | Sales tax — US marketplace facilitator | Must | 5.2 |
| REQ-026 | Counterfeit / IP takedown process | Must | 5.2 |
| REQ-027 | Accessibility — WCAG 2.1 AA | Must | 5.2 |
| REQ-028 | Reliability — service availability | Should | 5.2 |
| REQ-029 | Observability — error & product analytics | Should | 5.2 |
| REQ-030 | Stripe Connect — marketplace payments | Must | 5.3 |
| REQ-031 | Shipping aggregator (Shippo / EasyPost) | Must | 5.3 |
| REQ-032 | Image CDN | Must | 5.3 |
| REQ-033 | Auth provider (Clerk / Supabase / Auth0) | Must | 5.3 |
| REQ-034 | Tax-calc provider (TaxJar / Avalara) | Must | 5.3 |
| REQ-035 | Notification provider (email + SMS/push) | Must | 5.3 |
| REQ-036 | Comics metadata source (GCD) | Should | 5.3 |
| REQ-037 | Product analytics (Amplitude / Mixpanel / PostHog) | Should | 5.3 |
