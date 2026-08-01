# AI-DLC State Tracking

## Project Information
- **Project Type**: Greenfield
- **Project Name**: kids-collection (Collectible Card Binder for Kids)
- **Current Stage**: INCREMENT 21 (Pull Page: Most Recent 8 Categories + Random) COMPLETE — migration 0006 applied to prod Neon, deployed to Vercel prod 2026-07-31 (kids-collection-h3w7rgb6m, READY). typecheck clean, 182/182 tests, build ✅, zero new deps. `themes.sort_order` makes chip order a contract (backfilled to the order children already saw); pull screen capped to 🎲 Random + the 8 newest (hides Animals + Mythic Creatures); hiding is presentation-only — Random and every ticket flow still draw from all 10 categories.
- **Current Stage**: INCREMENT 20 (Two New Categories — Spooky Legends + Deep Sea Creatures) IN PROGRESS — CONSTRUCTION / Build & Test. Content-only increment: `seed/cards.json` 8→10 themes, 240→300 cards. No migration, no app-code change (no theme name is referenced in code). Publishing via `pnpm seed --sync`, then prod deploy.
- **Current Stage**: INCREMENT 22 (Friend-First Trade Board + Galaxy Sacrifice Filter) **COMPLETE** — deployed to Vercel prod 2026-08-01 (kids-collection-92pclzcn2, Ready). typecheck clean, 206/206 tests (182+24, stable x2), build ✅, no migration/seed/deps, no client-bundle secret. Trade is now friend-first: pick the partner, then a two-column board badges only the cards the OTHER party lacks (🎁 New for {name} / 🆕 New for you), with per-column 'only show what's missing' filters defaulting off and mismatched rarities dimmed. Galaxy gained a two-chip Show row (🌌 All cards / 🔥 Ready to sacrifice N) rendering a global flat burn grid that deep-links to the card detail page. **Sacrifice eligibility corrected to 4+ copies** (burn 3, keep 1) — SACRIFICE_MIN now lives beside SACRIFICE_COST and gates both the card detail page and the filter, with a PBT asserting the equivalence. Throwaway prototype removed. Build & Test COMPLETE (test:pg 34 passed, prod data-path check ALL PASSED). ⚠️ Visual check on a signed-in child profile still outstanding (checklist in build-and-test §4). ⚠️ Follow-up: burnable = 0 for all 3 children today — sacrificing is currently unreachable for everyone (pre-existing); revisit the 4-copy threshold in a future increment.
- **Prior Increment**: INCREMENT 18 (Badge Visibility + Galaxy Modal Viewport) COMPLETE — deployed to Vercel prod 2026-07-15 (kids-collection-q33wv4ktj, READY). typecheck clean, 99/99 tests, build ✅. No migration, no new deps. FR1 shared `.badge-new`/`.badge-count` (globals.css) — larger, gradient, border+shadow, z-10 — applied to EasterEggPicker 🆕/➕×N, Card x{count}, CardSlot x{count}. FR2 CollectionRewardModal portaled to document.body (createPortal) to escape `.page-enter` transform containing-block so `fixed inset-0` centers in viewport not tall page.
- **Prior Increment**: INCREMENT 17 (Collection-Reward Modal Bugfix) COMPLETE — deployed to Vercel prod 2026-07-14 (kids-collection-chid52y8e). markRewardsShown ANY->inArray so shownAt persists; modal shows once. 99/99 tests.
- **Prior Increment**: INCREMENT 16 (Sacrifice Ticket, Egg Clarity, Collection Reward) COMPLETE — migration 0004 applied, deployed to Vercel prod 2026-07-13 (kids-collection-f7vg3bhik). 99/99 tests. Sacrifice->rarity-pick ticket; pull-screen redeem; admin grant; egg 🆕/➕×N; collection-completion reward (race-safe, cascade, modal).
- **Prior Increment**: INCREMENT 15 (Admin Gate TTL + Reward SFX) COMPLETE — deployed to Vercel prod 2026-07-12 (kids-collection-42kdz7ep4, READY). No migration/seed. 92/92 tests. FR1 admin passcode gate 20s sliding (middleware; Google session untouched); FR2 epic/legendary fanfares layered on all reveals; FR3 dedicated easterEgg SFX on picker-appear.
- **Prior Increment**: INCREMENT 14 (Kid-to-Kid Trading) COMPLETE — deployed to Vercel prod 2026-07-12 (kids-collection-angqs24i0, READY). No migration/seed. 90/90 tests. Two-sided same-rarity duplicate swap (/play/trade), atomic via db.batch + count>=1 CHECK, giver=server-side active profile.
- **Prior Increment**: INCREMENT 13 (UX Polish) COMPLETE — deployed to Vercel prod 2026-07-12 (kids-collection-f85udfnvs, READY). typecheck clean, 85/85 tests, build ✅, zero new deps, NO migration/seed, no secret in client bundle. FR1/2 galaxy rarity chip row (owned counts + tap-to-filter, AND-combines with category, filtered view keeps locked cards); FR3 all ticket types (🎟️/✨/🍀) on Manage-Profiles rows + child landing; FR4 first-duplicate sacrifice-hint modal via per-child localStorage (no migration); FR5 removed EasterEggPicker post-pick roulette spin; FR6 per-question quiz feedback (✅/❌ + correct answer + 💡 why + Next) — answer keys sent client-side for feedback, award stays server-authoritative via signed offer.
- **Prior Increment**: INCREMENT 9 (Galaxy Nav, Prominent Pick & Special Egg Tickets) COMPLETE — migration 0002 applied to prod, deployed to Vercel production 2026-07-11 (kids-collection.vercel.app). typecheck clean, 57/57 tests, build ✅, zero new npm deps, **migration 0002** (epic_tickets/lucky_tickets on children). FR1 sticky galaxy category tab bar (GalaxyView; ★ All default, filters to one theme); FR2 prominent pull category chips (Random default, replaces <select>); FR3 chips persist + stay on result view for next-pull switching; FR4 special egg tickets (✨ epic+ / 🍀 lucky) — parent grants on admin dashboard, guaranteed pick-1-of-5, cost 1 special ticket only (spent atomically at claim → offer single-use; kind pinned in signed offer).
- **Prior Increment**: INCREMENT 8 (New Eggs, Category Pick & Sort Fix) COMPLETE — deployed to Vercel prod 2026-07-11 (dpl_Aog3CFUwB…). common/rare egg, sacrifice-to-upgrade, category pick, true sort fix (getAdminOverview).
- **Prior Increment**: INCREMENT 7 (UX Polish & Fixes) COMPLETE — deployed to Vercel prod 2026-07-11 (dpl_d6UcHei5…). CardRoulette slot-machine, larger picker avatar, admin edit-profile, listChildren name-sort, sticky galaxy back.
- **Prior Increment**: INCREMENT 6 (Missing-Card Names & Easter-Egg Pick) COMPLETE — held at Operations gate (placeholder). typecheck clean, 52/52 tests, build ✅, zero new deps, AUTH_SECRET absent from client bundle. Missing-card names + ~1% pick-1-of-5 epic+ easter egg (signed offer, atomic claim) with roulette + fireworks. Forced-egg visual QA PASSED (trigger→5 epic+ picker→roulette→land on Legendary→jackpot; token refund-then-spend net 1 verified; locked-slot names confirmed). Deployed to Vercel production 2026-07-11.
- **Prior Increment**: INCREMENT 5 (Card Expand & Rarity Clarity) COMPLETE — admin expand modal + binder rarity; 45/45 tests, deployed to prod.
- **Prior Increment**: INCREMENT 4 (Admin Gate, Preview & Content) COMPLETE — held at Operations gate. 42/42 tests, deployed to Vercel prod. Post-merge: `pnpm db:migrate`, `pnpm seed --sync`, set `ADMIN_PASSCODE`.
- **Prior Increment**: INCREMENT 3 (Branding & Galaxy Theme) COMPLETE — Star Catchers rebrand, galaxy theme, asteroids, avatar fix; verified live
- **Prior Increment**: INCREMENT 2 (Sensory) COMPLETE — sound/BGM/animation, 33/33 tests, build ✅
- **Prior Increment**: INCREMENT 1 (Core App) COMPLETE — all 7 units built, 27/27 tests, deployed, held at Operations gate

## Workspace State
- **Existing Code**: No
- **Reverse Engineering Needed**: No
- **Workspace Root**: /Users/selwynyeow/personal/kids-collection

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection (Greenfield)
- [x] Requirements Analysis
- [x] User Stories
- [x] Workflow Planning
- [x] Application Design
- [x] Units Generation

### 🟢 CONSTRUCTION PHASE — Cadence: FULL CEREMONY (per-unit gates)
Order: U1 → {U2, U3} → U4 → {U5, U6} → U7. Per unit: Functional Design → NFR Requirements → NFR Design → Infrastructure Design → Code Generation.
- [x] **U1 Foundation & Data** — Functional/NFR/Infra design + Code Gen DONE
- [x] U2 Auth & Profiles — DONE (A1, A2, B1)
- [x] U3 Pool & Seeding — DONE (G2)
- [x] U4 Pull & Rewards — DONE (C1,C3,C4,F1,F2; C2 in U6)
- [x] U5 Binder — DONE (D1, D2)
- [x] U6 Card UI & Effects — DONE (E1,E2,E3,C2 reveal)
- [x] U7 Admin — DONE (G1, F1; A2 reused)
- [x] Build and Test — build ✅, 27/27 tests ✅, deployed

## INCREMENT 2 — Sensory Enhancement (Sound FX, BGM, Animation)
Brownfield feature on existing app. Cadence: LIGHT (single increment).
### 🔵 INCEPTION
- [x] Requirements Analysis
- [x] Application Design
### 🟢 CONSTRUCTION
- [x] Code Generation — typecheck clean, 33/33 tests, build ✅, zero new deps
- [x] Build & Test — instruction doc written (increment2-sensory-build-and-test.md); build ✅, 33/33 tests
New modules: src/features/sound/* (settings, sfx, AudioEngine, bgm, SoundProvider, useSound, SoundControls), src/features/anim/* (Confetti, CountUp, useReducedMotion, anim.css), app/play/layout.tsx (NEW), public/bgm/. Seams: PullButton, RevealCard, CardSlot, ThemeSection, SetCompleteCelebration.

## INCREMENT 3 — Branding & Visual Overhaul (Naming, Galaxy Theme, Avatar Fix)
Brownfield enhancement + bug fix on existing app. Cadence: LIGHT (single increment).
Scope from request: punchier name/terms · drop poker-card icons for child-friendly motif · galaxy theme with periodic asteroids · fix invisible avatar (regression: `.hero-avatar::before` dark disc covers bare-text emoji on play-home hero).
Answers (increment3-branding-questions.md): 1=Star Catchers, 2=Discover, 3=My Galaxy, 4=Planet/Rocket, 5=Full re-theme, 6=Occasional asteroids, 7=Fix+planet framing, 8=Play area only, 9=Keep rarity names.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment3-branding-requirements.md)
- [x] Application Design — APPROVED (increment3-branding-design.md)
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (code-summary.md); typecheck clean, 33/33 tests, build ✅, zero new deps. 2 new files (brand.ts, Asteroids.tsx) + 11 edits. Avatar regression fixed (CSS stacking).
- [x] Build & Test — instruction doc written (increment3-branding-build-and-test.md); typecheck clean, 33/33 tests, build ✅, zero new deps.
### 🟡 OPERATIONS
- [x] Operations gate — user approved (2026-07-11). Placeholder stage; increment COMPLETE.

## INCREMENT 4 — Admin Gate, Preview & Content
Brownfield enhancement + security + content. Cadence: LIGHT (single increment). Security extension APPLICABLE + enforced (passcode).
Scope from request: admin passcode gate · full-catalog admin preview with effect-trigger buttons · replace Superheroes with Dinosaurs · true fun fact + admin source link per card.
Answers (increment4-admin-content-questions.md): 1=env ADMIN_PASSCODE, 2=gate all /admin/* via signed cookie, 3=full catalog, 4=all effects, 5=12 dinos same mix, 6=wipe test data, 7=all cards sourced (fictional→myth/legend origin), 8=reuse eduText + add sourceUrl, 9=admin-only link, 10=all four together.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment4-admin-content-requirements.md)
- [x] Application Design — APPROVED (increment4-admin-content-design.md); gate cookie reuses AUTH_SECRET
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment4-admin-content/code-summary.md); typecheck clean, 42/42 tests, build ✅, zero new deps, no client-bundle secret leak. New: cards.sourceUrl (migration 0001), gate-token/gate, unlock flow, catalog preview, EffectTriggerPanel, admin-only source links; seed --sync delta mode.
- [x] Build & Test — instruction doc (increment4-admin-content-build-and-test.md); 42/42 tests, build ✅.
### 🟡 OPERATIONS
- [x] Operations gate — user approved (2026-07-11). Placeholder; increment COMPLETE. Deployed to Vercel prod.
Security findings: none blocking (passcode server-only, constant-time compare, signed httpOnly HMAC cookie, secrets absent from client bundle).

## Post-Increment Content Work (not a gated increment)
- Expanded every category to 30 cards; restored Superheroes (kids collecting) → 4 themes × 30 = **120 cards**, uniform 15 common / 8 rare / 5 epic / 2 legendary. Each card has a true fact (real subjects) or legend/concept source (fictional). Applied via `pnpm seed --sync` (delta: new images only, existing updated in place, kids' collections preserved).

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | Yes | Requirements Analysis |
| Resiliency Baseline | Yes | Requirements Analysis |
| Property-Based Testing | Yes | Requirements Analysis |

## INCREMENT 10 — Ticket Fixes, Buttons & New Categories
Brownfield fixes + content. Cadence: LIGHT (single increment). No schema migration.
Scope (F1=B split → quizzes deferred to INC 11): FR1 combined special-ticket pill on landing (A1=C, fixes "0 tickets" bug); FR2 hide ask-parent unless ALL ticket types 0, else show special buttons + greyed Discover (B1=A/B2=B); FR3 convert all link-soft text links → buttons (C1=A); FR4 new Country theme 30 cards, iconic item per country, rarity-by-fame (E2/E3=A); FR5 new Famous People theme 30 cards, global + few SG figures (E4/E5=A); FR6 gen ~60 images via seed (F2=A). 4→6 themes, 120→180 cards.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment10-fixes-categories-requirements.md)
### 🟢 CONSTRUCTION
- [x] Application Design — DONE (increment10-fixes-categories-design.md); rosters locked (30 Country + 30 Famous People incl 3 SG)
- [x] Code Generation — DONE (increment10-fixes-categories/code-summary.md); typecheck clean, 61/61 tests (stable x3), build ✅, zero deps, no migration, no secret leak. NEW ticket-display.ts (PBT); FR1 home special pill; FR2 PullButton greyed-Discover; FR3 5 links→buttons; FR4/FR5 seed Country+Famous People (180 cards); incidental pickUpgradeCard clamp. ⚠️ images not yet generated (pnpm seed --sync required).
- [x] Build & Test — instruction doc (increment10-fixes-categories-build-and-test.md); typecheck clean, 61/61 tests, build ✅, seed validated (6 themes/180 cards). ⚠️ pnpm seed --sync (local + prod) still needed to publish 60 new-category images.
### 🟡 OPERATIONS
- [x] Operations gate — DEPLOYED to Vercel prod 2026-07-11 (kids-collection-38jdo0zjn, READY 53s). Seed synced (6 themes/180 cards, Country+Famous People live). INCREMENT 10 COMPLETE.

## INCREMENT 11 — Educational Quizzes
Brownfield feature. Cadence: LIGHT-MEDIUM. Migration 0003 (quiz_completions). Independent of Inc10.
Answers: Q1=D hybrid (math procedural in-app / grammar static bank); Q2=B 6 topics (Add-within-20, Sub-within-20, Number-bonds-10 | Nouns-vs-Verbs, A/An/The, Singular-vs-Plural); Q3=A cap resets midnight SGT; Q4=B 1 ticket/topic/day; Q5=A authored lessons; Q6=A friendly no-retry; Q7=A admin recent+totals; Q8=A migration. Reward 1 lucky/all-correct, server-authoritative re-score, global cap 3/day.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment11-quizzes-requirements.md)
### 🟢 CONSTRUCTION
- [x] Application Design — DONE (increment11-quizzes-design.md); module src/features/quiz/*, migration 0003 quiz_completions, signed quiz-offer (server re-score), SGT dayKey caps, math-gen procedural + grammar-bank
- [x] Code Generation — DONE (increment11-quizzes/code-summary.md); typecheck clean, 76/76 tests (stable x3), build ✅, zero deps, migration 0003 (quiz_completions), no secret leak. New src/features/quiz/* module + /play/learn pages + admin quiz panel. Server-authoritative scoring (signed quiz-offer). Incidental: fixed admin Binder link→button (Inc10 FR3 miss). ⚠️ pnpm db:migrate required (local+prod).
- [x] Build & Test — instruction doc (increment11-quizzes-build-and-test.md); typecheck clean, 76/76 tests, build ✅, no secret leak. ⚠️ pnpm db:migrate (0003) required local+prod; no seed.
### 🟡 OPERATIONS
- [x] Operations gate — migration 0003 applied to prod (quiz_completions verified), pushed main→Vercel prod (kids-collection-38jdo0zjn READY). INCREMENT 11 COMPLETE.

## INCREMENT 11 — Pre-captured answer archive (superseded by section above)
Item 4. Answers pre-captured in increment10-quiz-categories-questions.md: D1=A both math+grammar (SG lower-primary); D2=B 5 Q; D3=A 1 lesson card teach-first; D4=A reward 1 lucky ticket; D5=B no retry; D6=D daily cap 3 quiz tickets; D7 OPEN (dynamic/API gen — proposed Claude API haiku-generated bank, resolve at Inc 11 scoping); D8=B random N from bank; D9=A "🧠 Play & Learn" home button; D10=A auto-grant; D11=A admin quiz-activity summary.

## INCREMENT 12 — Harder Quiz Topics
Brownfield content change inside Inc11 quiz module. Cadence: LIGHT. No schema/migration/seed.
Request: math → multiplication & division within 100, number bonds to 100; grammar → verb tenses (past/present/past-continuous), pronouns vs proper nouns, + more advanced topics.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment12-harder-quizzes-requirements.md); answers Q1=A,Q2=A,Q3=C,Q4=A/B/C/D,Q5=9,Q6=A
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment12-harder-quizzes-code-summary.md); 9 topics (3 math procedural mult/div/bonds-100, 6 grammar banks), typecheck clean, 77/77 tests, build ✅, no schema/migration/seed.
### 🟡 OPERATIONS
- [x] Operations gate — DEPLOYED to Vercel prod (kids-collection-q22mkb2jp, READY 39s). Redeploy only. INCREMENT 12 COMPLETE.

## INCREMENT 13 — UX Polish (Rarity Counts/Filter, Ticket Visibility, Sacrifice Hint, Quiz Feedback)
Brownfield polish. Cadence: LIGHT (single increment). No migration/seed. Answers: Q1.1=D,Q1.2=A,Q2.1=manage-profile+child-landing,Q3.1=B,Q3.2=A,Q3.3=A,Q4.1=A,Q4.2=A,Q4.3=B,Q5.1=A,Q6.1=B,Q6.2=A,Q7=B,Q8=A.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment13-polish-requirements.md)
- [x] Application Design — APPROVED (increment13-polish-design.md)
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment13-polish/code-summary.md); typecheck clean, 85/85 tests, build ✅, zero deps, no migration/seed, no secret leak. NEW rarity-filter.ts (PBT), sacrifice-hint.ts, SacrificeHintModal.tsx. FR1/2 galaxy rarity chips; FR3 ticket counts; FR4 first-dup modal (localStorage); FR5 drop easter-egg spin; FR6 per-question quiz feedback (client answer key, server-authoritative reward).
- [x] Build & Test — instruction doc (increment13-polish-build-and-test.md); typecheck clean, 85/85 tests (stable), build ✅, no migration/seed
### 🟡 OPERATIONS
- [x] Operations gate — DEPLOYED to Vercel prod 2026-07-12 (kids-collection-f85udfnvs, READY). No migration/seed. INCREMENT 13 COMPLETE.

## INCREMENT 14 — Kid-to-Kid Card Trading
Brownfield feature. Cadence: LIGHT (single increment). No migration/seed. Answers: all A (increment14-trading-questions.md) — two-sided same-rarity swap, giver-dup-only, self-serve, instant atomic, /play/trade flow, confirm.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment14-trading-requirements.md)
- [x] Application Design — APPROVED (increment14-trading-design.md); atomic swap via db.batch (neon-http), dup-only backstopped by count>=1 CHECK
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment14-trading/code-summary.md); typecheck clean, 90/90 tests (85+5), build ✅, zero deps, no migration/seed, no secret leak. NEW src/features/trade/* (logic PBT, service atomic batch swap, actions, TradeFlow) + /play/trade + home link.
- [x] Build & Test — instruction doc (increment14-trading-build-and-test.md); typecheck clean, 90/90 tests (stable), build ✅, no migration/seed
### 🟡 OPERATIONS
- [x] Operations gate — DEPLOYED to Vercel prod 2026-07-12 (kids-collection-angqs24i0, READY). No migration/seed. INCREMENT 14 COMPLETE.

## INCREMENT 15 — Admin Gate TTL + Reward SFX
Brownfield security + sensory. Cadence: LIGHT. No migration/seed/deps. Answers (increment15-questions.md): Q1.1=B(20s literal),Q1.2=A(sliding),Q1.3=B(admin gate only, not Google session),Q2.1=B(2 fanfares),Q2.2=A(layer),Q2.3=A(all reveals),Q3.1=A(dedicated),Q3.2=B(picker-appear),Q3.3=B(layer),Q4=A.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment15-requirements.md)
- [x] Application Design — APPROVED (increment15-design.md)
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment15/code-summary.md); typecheck clean, 92/92 tests (90+2), build ✅, zero deps, no migration/seed, no secret leak. FR1 gate 20s sliding via middleware; FR2 epic/legendary fanfares layered at 4 reveal seams; FR3 easterEgg SFX on picker-appear.
- [x] Build & Test — instruction doc (increment15-build-and-test.md); typecheck clean, 92/92, build ✅, no migration/seed.
### 🟡 OPERATIONS
- [x] Operations gate — DEPLOYED to Vercel prod 2026-07-12 (kids-collection-42kdz7ep4, READY). No migration/seed. INCREMENT 15 COMPLETE.

## INCREMENT 16 — Sacrifice Ticket, Egg Draw Clarity, Collection Reward
Brownfield gameplay + schema. Cadence: LIGHT-MEDIUM. Migration 0004 (4 pick-ticket cols + collection_rewards). Answers: Q1.1=B,Q1.2=B,Q1.3=A,Q1.4=A,Q1.5=A,Q1.6=A,Q2.1=A,Q2.2=A,Q2.3=A,Q4.1=A+modal,Q4.2=A,Q4.3=A,Q4.4=A,Q4.5=A,Q5=A,Q6=A.
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment16-requirements.md)
- [x] Application Design — APPROVED (increment16-design.md)
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment16/code-summary.md); typecheck clean, 99/99 tests (92+7), build ✅, zero deps, no secret leak. Migration 0004 GENERATED. FR1 sacrifice->rarity-pick ticket; FR2 pullRarityPick redeem; FR3 admin grant; FR4 egg 🆕/➕×N; FR5 collection-completion reward (race-safe insert-before-grant + cascade + pending modal). ⚠️ pnpm db:migrate (0004) NOT YET APPLIED — needs auth.
- [x] Build & Test — instruction doc (increment16-build-and-test.md); migration 0004 APPLIED to Neon DB; typecheck clean, 99/99, build ✅
### 🟡 OPERATIONS
- [x] Operations gate — migration 0004 applied, DEPLOYED to Vercel prod 2026-07-13 (kids-collection-f7vg3bhik, READY). INCREMENT 16 COMPLETE.

## INCREMENT 17 — Collection-Reward Modal Re-appears (Bugfix)
Bugfix on Inc16 FR5. Cadence: LIGHT. No migration/seed/deps.
Root cause: markRewardsShown used raw `= ANY(${ids})` → JS array mis-bound → matched 0 rows → shownAt never set → modal re-popped every galaxy visit. Fix: drizzle `inArray`.
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment17-reward-modal-bugfix.md); one-line fix in rewards/service.ts (inArray). typecheck clean, 99/99 tests, build ✅, no migration/deps.
### 🟡 OPERATIONS
- [x] Operations gate — DEPLOYED to Vercel prod 2026-07-14 (kids-collection-chid52y8e, READY). No migration. INCREMENT 17 COMPLETE.

## INCREMENT 19 — Unify Special Tickets → Easter Egg Ticket
Brownfield refactor. Cadence: LIGHT-MEDIUM (single increment, schema migration likely). Intent: collapse all special tickets into ONE "easter egg" ticket.
Current special-ticket surface (6 balances on `children`): `epic_tickets` (✨ pick-1-of-5 epic+), `lucky_tickets` (🍀 pick-1-of-5 common/rare), `common/rare/epic/legendary_pick_tickets` (🎯 pick-1-of-5 one exact rarity, Inc16). Separate ~1% random egg trigger (`rollEasterEgg`) is NOT a grantable ticket.
Intent Analysis: Request type=Refactoring/Enhancement; Scope=Multiple components (schema, types, stores pg+fake, mappers, admin GrantControl, pull actions/services, offer, EasterEggPicker, SacrificePanel, pick-tickets); Complexity=Moderate; Requirements depth=Standard.
Answers: Q1=D→clarQ1=D (weighted rarity roll via RARITY_WEIGHTS → single-rarity pick-1-of-5), clarQ2=A (surprise-reveal tier), Q2=A (sum 6 cols 1:1), Q3=A (~1% random egg unchanged/epic+), Q4=A (🥚 "Easter Egg ticket"), Q5=B (one +1/−1 stepper), Q6=A (sacrifice 3 dups→1 egg ticket), Q7=A (build+migrate+deploy prod).
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED-PENDING (increment19-unify-tickets-requirements.md); FR1–FR9 + NFR1–5. User Stories SKIPPED (refactor, single increment). AWAITING approval at gate.
- [x] Application Design — APPROVED-PENDING (increment19-unify-tickets-design.md). Migration 0005 (add easter_egg_tickets, backfill sum of 6, drop old). New pull-service.pullEasterEgg (weighted roll → pick-1-of-5); offer {easterEgg,rolledRarity}; claim spends easterEggTickets. Collapses actions/token-service/GrantControl/PullButton/EasterEggPicker(reveal)/SacrificePanel/quiz-award. ⚠️ Extra touchpoint found: quiz-service awards a lucky ticket → now easterEggTickets. AWAITING approval at gate.
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment19-unify-tickets/code/code-summary.md). All 12 plan steps [x]. typecheck clean, 174/174 tests, build ✅, no client secret leak, no *_new files. Migration 0005 GENERATED (add easter_egg_tickets + backfill sum-of-6 + drop old); journal + 0005_snapshot hand-authored, db:generate confirms "No schema changes". ⚠️ Migration 0005 NOT YET APPLIED (needs DB auth) — Build & Test. Note: migration sum-invariant enforced by SQL, validated on apply (no pure-JS fn to unit-test); random ~1% egg untouched (Q3=A). AWAITING approval at Code Gen gate.
- [x] Build & Test — DONE (build-and-test/increment19-unify-tickets-build-and-test.md). typecheck clean, 174/174 tests, build ✅. Migration 0005 APPLIED to Neon prod (pre-check Σ old 6 cols = 0 → zero-risk; post-verify children = pull_tokens+easter_egg_tickets, Σ egg=0, checks OK). db:generate → "No schema changes". AWAITING approval to proceed to Operations (prod deploy).
### 🟡 OPERATIONS
- [ ] Operations gate — Q7=A: deploy to Vercel prod (git push main → Vercel). Migration already applied.

## INCREMENT 20 — Two New Categories: Spooky Legends + Deep Sea Creatures
Brownfield, content-only. Cadence: LIGHT. No migration, no app-code change, no new deps. Scope finding: a "category" is a `themes` row sourced entirely from `seed/cards.json`; grepping all 8 existing theme names across `.ts`/`.tsx` returns zero hits, so the galaxy tab bar, pull chips, rarity filters and set-completion reward pick up new themes automatically.
Answers (increment20-new-categories-questions.md): Q1=D ("Spooky Legends"), Q2=B (playfully spooky, non-scary), Q3=A ("Deep Sea Creatures"), Q4=A (30 cards @ 15/8/5/2), Q5=A (no name overlap with Animals — true deep/mid-water species only), Q6=A (folklore/literary eduText + real Wikipedia sourceUrl), Q7=B (straight `seed --sync`, no review pass), Q8=A (seed prod + deploy), Q9=B (close Inc 19's ops gate at the end of this increment).
### 🔵 INCEPTION
- [x] Requirements Analysis — APPROVED (increment20-new-categories-requirements.md); FR1–FR6 + NFR1–6. User Stories / Application Design / Units Generation / all NFR+Infra Design stages SKIPPED — content-only, single unit, no new components.
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment20-new-categories/code/code-summary.md). All 9 plan steps [x]. `seed/cards.json` +2 themes / +60 cards, purely additive (+430 / −0 lines). Spooky Legends disjoint from Mythic Creatures; Deep Sea Creatures disjoint from Animals. Validated: pyramid 15/8/5/2 each, 0 name collisions against all 240 existing cards, max eduText 102 chars, `loadSeed` schema OK (10 themes / 300 cards), all 60 sourceUrls HTTP-checked (2 x 404 found + fixed). Refreshed the stale seed/AUTHORING_PROMPT.md. typecheck clean, 174/174 tests, build ✅, zero new deps.
- [x] Build & Test — DONE (build-and-test/increment20-new-categories-build-and-test.md). typecheck clean, 174/174 tests, build ✅. `pnpm seed --sync` in 2 passes (pass 1: 31 inserted / 4 × Pollinations 429 / cut short by a 10-min harness timeout; pass 2 detached at SEED_CONCURRENCY=1 SEED_THROTTLE_MS=6000 SEED_RETRIES=8: 29 inserted, 0 failed). Net 60 cards inserted, 271 text-only updates, prunedThemes=0 prunedCards=0. Prod Neon verified: 10 themes × 30 cards = 300, every card has a Blob imageUrl, all pyramids 15/8/5/2. Visual kid-safety QA on the 6 riskiest renders: Dracula/Frankenstein/Werewolf/Mothman/Headless Horseman PASS. Zombie initially FAILED NFR1 (torn leg with visible bone) — imagePrompt tightened with explicit negatives, user ran the `DELETE FROM cards` (blocked from here as a destructive prod write; card was unowned), re-sync rebuilt exactly that card (inserted 1 / updated 299 / 0 pruned) and the new render PASSES: hooded, intact, no bones or wounds. Pool back to 10 themes × 30 = 300.
### 🟡 OPERATIONS
- [x] Operations gate — Q8=A: pushed to main → Vercel prod. NOTE: the 60 new cards were already live to children the moment `seed --sync` wrote them to Neon; the deploy only ships the seed file + docs. Per Q9=B this also closes INCREMENT 19's outstanding Operations gate (migration 0005 applied 2026-07-25, code already on origin/main at d34d986 and auto-deployed).

## INCREMENT 22 — Friend-First Trade Board + Galaxy Sacrifice Filter
Brownfield enhancement ×2 + one defect correction. Cadence: LIGHT-MEDIUM (single increment, Q13=A). **No migration, no seed, no new deps.**
Answers (increment22-trade-sacrifice-questions.md): Q1=B (filters default OFF), Q2=A (hide), Q3=A (dim mismatched rarities), Q4=B (preload all friends, count on each chip), Q5=A (mobile stacks own-cards-first), Q6=A (🎁 New for {name} / 🆕 New for you), Q7=A (replace the old flow entirely), Q8=B (only `All` + `🔥 Ready to sacrifice`), Q9=C (burn view ignores category AND rarity), Q10=A (flat grid), Q11=B (plain 🔥, no multiplier), Q12=A (galaxy only), Q13=A (one increment), Q14=A (deploy to prod), Q15=A (carry all 3 extensions).
**Defect found at prototype review**: sacrifice eligibility is `count >= SACRIFICE_COST + 1` (**4+ copies — burn 3, keep 1**), NOT `>= 3`. `pull-service.ts:232` passes `minHeld = SACRIFICE_COST + 1` and `app/play/binder/[cardId]/page.tsx:29` gates on `count > SACRIFICE_COST`. FR10 pins this, derived from the constant.
### 🔵 INCEPTION
- [x] Prototype (pre-Requirements, throwaway) — Trade Variant A + Galaxy Variant B chosen
- [x] Requirements Analysis — APPROVED 2026-08-01 (increment22-trade-sacrifice-requirements.md); FR1–FR17 + NFR1–7 + 14 acceptance criteria. User Stories SKIPPED (no new persona/journey).
- [x] Application Design — APPROVED 2026-08-01 (D1=A, D2=A, D3=A, D4=B, D5=A) (application-design/increment22-trade-sacrifice-design.md). Slice A: NEW pure `trade/board.ts` + `TradeBoard.tsx` (replaces TradeFlow.tsx), trade-service +getTradeBoard +listFriendSummaries −listMatchesForRarity, actions getMatchesAction→getTradeBoardAction, NEW port `CollectionStore.ownedCardIdsForChildren` (one batched query for FR7 counts, contract-tested on both adapters). Slice B: NEW pure `binder/sacrifice-filter.ts` (SACRIFICE_MIN derived from SACRIFICE_COST) + two-chip Show row in GalaxyView + NEW SacrificeGrid.tsx. Commit path untouched. §2.3 lists every deletion incl. all prototype files. Decisions D1–D5 pending; D4 recommends B (hoist SACRIFICE_MIN next to SACRIFICE_COST and use it on the card detail page too, so both sites are the same expression).
### 🟢 CONSTRUCTION
### 🟡 OPERATIONS
- [x] Operations gate — Q14=A: pushed 40ce8cf..475afbb to origin/main; Vercel prod deployment dpl_GtzpfZErEvtJp6AozfGJuthqQJcA (kids-collection-92pclzcn2) Ready, holding the kids-collection.vercel.app alias. Code-only — no migration, no seed, no post-deploy step. INCREMENT 22 COMPLETE.
- [x] Build & Test — DONE (build-and-test/increment22-trade-sacrifice-build-and-test.md). typecheck clean, 206/206 stable x2, `pnpm test:pg` 34 passed/3 skipped incl. all 3 new ownedCardIdsForChildren cases on the REAL pg adapter, build ✅, no secret in client bundle. Read-only prod data-path check ALL PASSED (chip counts == badged counts both directions; no sub-4-copy card listed; every listed card's detail page would offer the panel; per-section burn sums == global). **PRODUCT FINDING**: burnable = 0 for all 3 children while they hold 11/6/3 cards at exactly 3 copies — the filter is legitimately empty today, and this is exactly the dead-end case the `>= 3` prototype would have produced. Sacrificing is currently unreachable for every child (pre-existing, not introduced here) — candidate for a future increment. ⚠️ Visual check NOT done (needs Google-authenticated session); dev server left on :3000 with a 6-point checklist.
- [x] Code Generation — DONE (increment22-trade-sacrifice/code/code-summary.md). Plan approved; all 16 steps [x]. typecheck clean, **206/206 tests** (182+24, stable x2), build ✅, zero new deps, no migration/seed, no client-bundle secret, no prototype residue. NEW: binder/sacrifice-filter.ts (PBT), binder/SacrificeGrid.tsx, trade/board.ts (PBT), trade/TradeBoard.tsx. SACRIFICE_MIN now lives beside SACRIFICE_COST and gates BOTH the card detail page and the galaxy burn filter. CollectionStore gained ownedCardIdsForChildren (pg + fake + 3 contract cases). trade-service +getTradeBoard +listFriendSummaries −listMatchesForRarity (+ChildDirectory port). DELETED TradeFlow.tsx and all throwaway prototype files. `pnpm test:pg` run at Build & Test — all 3 new contract cases green on the real pg adapter.

## INCREMENT 21 — Pull Page: Most Recent 8 Categories + Random
Brownfield enhancement + small additive migration. Cadence: LIGHT (single increment). Migration 0006 (`themes.sort_order`).
Scope finding: pull chips render every theme from `listThemes()` (no `ORDER BY`; `themes` has no sort column), so "recency" had no durable definition. Observed prod order (= the recency order per user): Animals, Mythic Creatures, Dinosaurs, Superheroes, Country, Famous People, Weird Insects, Special Plants, Spooky Legends, Deep Sea Creatures. Capping to 8 hides Animals + Mythic Creatures.
Answers (increment21-pull-recent-categories-questions.md): Q1=C (explicit ordering column, backfilled to observed order), Q1a=A (integer `sort_order`), Q2=A (hide Animals + Mythic Creatures), Q3=A (constant MAX_PULL_CATEGORIES=8), Q4=A (Random still draws from all 10), Q5=A (pull page only), Q6=A (Easter Egg pick pool unchanged), Q7=A (build+migrate+deploy prod), Q8=A (carry all 3 extensions).
### 🔵 INCEPTION
- [x] Requirements Analysis — AWAITING APPROVAL (increment21-pull-recent-categories-requirements.md); FR1–FR7 + NFR1–6. User Stories SKIPPED (single-screen presentational cap, no new persona/journey).
- [x] Requirements Analysis — APPROVED 2026-07-31 (increment21-pull-recent-categories-requirements.md)
- [x] Application Design — APPROVED 2026-07-31 (application-design/increment21-pull-recent-categories-design.md). Migration 0006 adds `themes.sort_order` (int NOT NULL DEFAULT 0) backfilled via a generic `row_number() OVER (ORDER BY ctid)` snapshot = today's scan order; `listThemes()` gains ORDER BY; `upsertTheme(name, sortOrder)` keeps it in step with seed/cards.json array position (file reordered to match so the next --sync is an ordering no-op); NEW pure `src/features/pull/categories.ts` (MAX_PULL_CATEGORIES=8 + generic `recentCategories`) applied server-side in app/play/pull/page.tsx. PullButton and the `Theme` type unchanged. D1=A ctid backfill, D2=A no type change, D3=A server-side cap, D4=A one ordering everywhere.
### 🟢 CONSTRUCTION
- [x] Code Generation — DONE (increment21-pull-recent-categories/code/code-summary.md). Plan approved; all 12 steps [x]. typecheck clean, 182/182 tests (174+8, stable x2), build ✅, zero new deps, no dup files. Migration 0006 GENERATED (themes.sort_order + ctid-ordered backfill); journal idx 6 + 0006_snapshot hand-authored, db:generate confirms "No schema changes". seed/cards.json reorder verified content-identical (per-theme SHA-256 equal, 300 cards, symmetric 215/215 diff). Migration 0006 applied at Build & Test. Code Gen gate APPROVED 2026-07-31.
- [x] Build & Test — DONE (build-and-test/increment21-pull-recent-categories-build-and-test.md). typecheck clean, 182/182 tests, build ✅, db:generate "No schema changes". Migration 0006 APPLIED to prod Neon (pre-check: 10 themes/300 cards, no sort_order column, scan order as recorded → post-verify: 10/300 unchanged, sort_order dense 0-9, 0 nulls, 0 duplicates). `pnpm seed --sync` = ordering no-op (0 inserted / 300 text-only updates / 0 pruned; sort_order unchanged after). End-to-end data-path check against prod: 9 chips 🎲 Random + Dinosaurs…Deep Sea Creatures, hidden = Animals + Mythic Creatures. AWAITING approval to proceed to Operations.
### 🟡 OPERATIONS
- [x] Operations gate — Q7=A: pushed main → Vercel prod (code 1268c06, docs 5160ec5); deployment kids-collection-h3w7rgb6m READY 2026-07-31. Migration 0006 already applied at Build & Test; no post-deploy seed needed.
