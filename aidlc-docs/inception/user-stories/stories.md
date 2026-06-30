# User Stories

**Scope**: v1 core. **Format**: As a/I want/so that + Given/When/Then acceptance criteria. **Breakdown**: Persona → Feature. INVEST-compliant.
Tags: `[SEC]` security-sensitive (Security extension), `[PBT]` logic to cover with property-based tests (PBT extension).

---

## Epic A — Parent: Auth & Setup (P0)

### A1 — Sign in with Google `[SEC]`
**As a** parent, **I want** to sign in with my Google account, **so that** only I can access and administer the app.
- Given I am unauthenticated, When I open the app, Then I see only a "Sign in with Google" screen.
- Given my Google email is on the allowlist, When I authenticate, Then I land on the child profile picker.
- Given a Google email NOT on the allowlist, When I authenticate, Then access is denied (no profiles, no admin).
- Given I am signed in, When my session expires/I sign out, Then I must re-authenticate to continue.

### A2 — Manage child profiles `[SEC]`
**As a** parent, **I want** to add, edit, and remove child profiles (name + avatar), **so that** each of my children has their own space.
- Given I am the authenticated parent, When I open admin, Then I can create a profile with a name and pick/assign an avatar.
- Given a profile exists, When I edit its name/avatar, Then changes persist.
- Given a profile exists, When I remove it, Then I am warned it deletes that child's collection, and on confirm it is removed.
- Given I am acting as a child (profile selected, not admin), When I attempt profile management, Then it is not available.

---

## Epic B — Profile Selection (P0/P1/P2/P3)

### B1 — Pick who's playing
**As a** child (via the family device), **I want** to tap my name/avatar after the parent signs in, **so that** I see my own binder.
- Given the parent is signed in, When the picker loads, Then all child profiles show as large tappable name+avatar tiles.
- Given I tap my profile, When it loads, Then the session is scoped to me (my binder, my tokens).
- Given a profile is selected, When I view content, Then I see only my own collection (not siblings'). `[SEC]`

---

## Epic C — Pulling Cards (P1/P2/P3)

### C1 — Pull a card (one at a time) `[PBT]`
**As a** child, **I want** to pull a new card one at a time, **so that** I can grow my collection with surprise.
- Given I have ≥1 pull token, When I tap "Pull", Then one token is spent and exactly one card is drawn from the shared pool.
- Given a pull occurs, When the card is chosen, Then selection is rarity-weighted random per the configured drop odds. `[PBT]`
- Given the draw completes, When it resolves, Then the card is added to my collection (or duplicate count incremented) and my token balance decreases by exactly one. `[PBT]`
- Given concurrent/double taps, When I pull, Then only one token is spent per card (no double-spend). `[PBT][SEC]`

### C2 — Pack-open reveal
**As a** child, **I want** an exciting reveal when I pull, **so that** opening feels special.
- Given a pull starts, When the card is drawn, Then a pack-open/reveal animation plays before the card is shown.
- Given the reveal plays, When it finishes, Then the full card (with effects) is displayed.
- Given the device requests reduced motion, When a pull occurs, Then the reveal degrades to a simple, non-animated transition. `[a11y]`

### C3 — Out of tokens
**As a** child, **I want** clear feedback when I have no pulls left, **so that** I know to ask my parent.
- Given my token balance is 0, When I tap "Pull", Then no card is drawn, no token is spent, and a friendly "Ask your parent for more pulls" message shows.
- Given balance is 0, When I view the pull screen, Then the Pull control is visibly disabled/empty.

### C4 — Duplicate handling `[PBT]`
**As a** child, **I want** duplicates to stack, **so that** pulling a card I own still counts.
- Given I pull a card already in my collection, When it resolves, Then its owned count increments (x2, x3, …) rather than creating a separate entry. `[PBT]`
- Given a duplicate is pulled, When shown, Then the reveal indicates it's a duplicate.

---

## Epic D — Binder / Collection (P1/P2/P3)

### D1 — View my binder
**As a** child, **I want** to see my cards grouped by theme, **so that** I can browse what I've collected.
- Given I have cards, When I open my binder, Then cards are grouped by theme with owned cards shown and duplicate counts (xN).
- Given a theme has cards I don't own, When I view it, Then unowned slots show as locked/silhouette placeholders.
- Given I tap an owned card, When it opens, Then it shows full-size with picture, name, rarity, theme, and educational text.

### D2 — Theme completion progress `[PBT]`
**As a** child, **I want** to see how complete each theme is, **so that** I'm motivated to finish.
- Given a theme of N cards and I own M distinct, When I view it, Then progress shows M/N (and/or %). `[PBT]`
- Given I complete a theme, When I own all N, Then it is marked complete.

---

## Epic E — Card View & Effects (P1/P2/P3)

### E1 — Rarity reflected on the card
**As a** child, **I want** the card to look rarer when it is rarer, **so that** rarity feels meaningful.
- Given a card of a given rarity (Common/Rare/Epic/Legendary), When displayed, Then its frame/styling clearly reflects that tier.
- Given two cards of different rarity, When compared, Then the higher rarity is visually distinguishable.

### E2 — Interactive effects
**As a** child, **I want** holographic shimmer and 3D tilt when I look at a card, **so that** it feels like a real shiny card.
- Given I view a card, When I move the pointer or tilt the device, Then a holographic shimmer and 3D tilt/parallax respond to the motion.
- Given a higher-rarity card, When viewed, Then effects are more intense than lower rarity (rarity-scaled).
- Given reduced-motion is requested, When I view a card, Then motion-based effects are minimized/disabled while the card stays legible. `[a11y]`
- Given a low-end device, When effects run, Then they degrade gracefully without breaking interaction. `[resiliency]`

### E3 — Age-appropriate educational text
**As a** child, **I want** a short fact on each card, **so that** I learn something.
- Given a card, When viewed, Then it shows a short, age-appropriate educational description.
- Given the pre-reader persona, When viewing, Then the UI does not depend on reading the text to use the app (image-forward). `[a11y]`

---

## Epic F — Rewards (P0)

### F1 — Grant pull tokens `[SEC][PBT]`
**As a** parent, **I want** to grant pull tokens to a specific child, **so that** I can use pulls as a reward.
- Given I am the authenticated parent, When I grant N tokens to a child, Then that child's balance increases by exactly N. `[PBT]`
- Given I adjust (add/subtract) a balance, When I confirm, Then the new balance persists and is non-negative. `[PBT]`
- Given a child profile (not parent), When token-grant is attempted, Then it is denied. `[SEC]`
- Given a child spends tokens by pulling, When the parent views balances, Then balances reflect spends accurately.

### F2 — Child sees token balance
**As a** child, **I want** to see how many pulls I have, **so that** I know what I can do.
- Given I'm on my profile, When I view the pull area, Then my current token balance is clearly shown.
- Given my balance changes (pull or parent grant), When I next view it, Then it reflects the current value.

---

## Epic G — Admin / Pool (P0)  *(minimal for v1)*

### G1 — View all collections & balances `[SEC]`
**As a** parent, **I want** to see each child's collection and token balance, **so that** I can oversee progress.
- Given I am the authenticated parent, When I open admin, Then I can view per-child collection summary and token balance.
- Given I am a child profile, When I try to open admin, Then it is not accessible. `[SEC]`

### G2 — Pool is seeded & safe
**As a** parent, **I want** all cards pre-generated and reviewable, **so that** my kids only see safe content.
- Given the card pool, When loaded into the app, Then every card has picture, name, rarity, theme, and educational text.
- Given a card image, When seeded, Then it was reviewable before being published to children. `[SEC]`
- Given the image service or storage fails during seeding, When seeding runs, Then it retries/falls back without corrupting the pool. `[resiliency]`

---

## Persona → Story Map
| Persona | Stories |
|---|---|
| P0 Parent | A1, A2, B1, F1, G1, G2 |
| P1 Child (4) | B1, C1–C4, D1, D2, E1, E2, E3, F2 |
| P2 Child (7) | B1, C1–C4, D1, D2, E1, E2, E3, F2 |
| P3 Child (9) | B1, C1–C4, D1, D2, E1, E2, E3, F2 |

## Extension coverage flags
- **Security `[SEC]`**: A1, A2, B1, C1(double-spend), F1, G1, G2.
- **PBT `[PBT]`**: C1 (rarity draw, token spend, no double-spend), C4 (duplicate accounting), D2 (progress math), F1 (grant/balance non-negative).
- **Resiliency**: E2 (degrade), G2 (seed retries/fallback).
- **Accessibility `[a11y]`**: C2, E2, E3 (reduced-motion, image-forward).
