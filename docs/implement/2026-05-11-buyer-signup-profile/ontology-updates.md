# Ontology Updates — 2026-05-11-buyer-signup-profile

Seeded by `implement:define` (Step 2). Merged into the project glossary at ship.

## Proposed terms

| Term | Definition | First use |
|------|-----------|-----------|
| **Buyer** | Authenticated end-user persona who browses, swipes, filters, and purchases. Authenticated via Clerk. (Re-affirming the architecture-level term in code/UI ontology.) | AC-2, AC-5 |
| **App Shell** | The cross-platform Expo project (iOS/Android/Web) that hosts every feature. Includes router, theme provider, auth gate, and base design-system primitives. | AC-1 |
| **Account screen** | The authenticated profile-edit surface: display name, avatar, notification preferences. Reachable from the authenticated home shell. | AC-5 |
| **OTP sign-up flow** | Sign-up path that begins with email or phone and completes via a one-time passcode. Both email and SMS variants converge on the same post-auth route. | AC-2, AC-3, AC-4 |
| **Design system primitive** | Reusable, themed, accessible UI component (Button, Field, Text, etc.) shared across iOS, Android, and Web. Carries a11y props by default. | AC-1, AC-6 |

## Notes

- "Buyer" is already established in `ideate/architecture.md` §3 stakeholders;
  this run promotes the term into the code-layer ontology (used for typing,
  routing, and analytics).
- "Account screen" is intentionally distinct from a generic "Profile page" —
  it is specifically the authenticated edit surface for the current user.
- "OTP sign-up flow" treats email and phone as variants of one flow rather
  than separate screens, in line with the issue's "indistinguishable on
  success" requirement.
