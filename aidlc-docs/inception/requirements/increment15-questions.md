# INCREMENT 15 — Session TTL + Reward SFX — Clarification Questions

3 items. LIGHT, zero new deps (SFX are synth recipes), no migration.
Answer inline with `[Answer]: <letter>`. Recommended marked.

---

## Item 1 — Parent login session shorter

Current: NextAuth has NO explicit `session.maxAge` → **30-day** JWT session. You wrote "20s".

**Q1.1 — Duration — 20s literal or 20 minutes?**
- A) **20 minutes** — sensible auto-logout for a kids' device the parent unlocks then hands over. (Recommended)
- B) **20 seconds** — literal. ⚠️ Logs the parent out almost immediately; every admin action re-auths. Confirm you really want this.
- C) Other (state value in notes, e.g. 5 min / 1 hour).

[Answer]:  B

**Q1.2 — Idle timeout or absolute?**
- A) **Sliding/idle** — session resets on activity; logs out after the chosen span of inactivity. (Recommended, NextAuth default behavior with maxAge)
- B) **Absolute** — hard expiry from login regardless of activity (needs extra handling).

[Answer]:  A

**Q1.3 — Scope of the timeout?**
- A) Whole parent auth session (affects `/play/*` + `/admin/*`, since all sit behind parent login). (Recommended — matches how auth works today)
- B) Only the `/admin/*` passcode gate, leave the Google session long. (Different mechanism — the admin gate cookie, not the session.)

[Answer]: B

---

## Item 2 — SFX on legendary / epic pull

Reveal already plays a rarity-scaled `"reveal"` sting. You want a special sound for the top tiers.

**Q2.1 — One sound or two?**
- A) **One shared "big pull" fanfare** for both epic AND legendary (louder/fuller than normal reveal). (Recommended, simplest)
- B) **Two distinct** — epic gets one fanfare, legendary an even bigger one.

[Answer]: B

**Q2.2 — Replace or layer?**
- A) **Layer** — keep the existing reveal sting, add the fanfare on top for epic/legendary. (Recommended — richer)
- B) **Replace** the reveal sound entirely for epic/legendary.

[Answer]: A

**Q2.3 — Applies where?**
- A) **Every epic/legendary reveal** — normal pulls, easter-egg jackpots, sacrifice upgrades, trades. (Recommended — consistent)
- B) Only on normal pull reveals.

[Answer]: A

---

## Item 3 — SFX on easter egg

Easter egg (pick-1-of-5) currently reuses `"setComplete"`.

**Q3.1 — Dedicated easter-egg sound?**
- A) **Yes — new distinct "easter-egg" fanfare** when the special pick appears / is won. (Recommended)
- B) Keep `setComplete`, just make it bigger.

[Answer]: A

**Q3.2 — When does it fire?**
- A) **On the jackpot reveal** (after the kid picks their card). (Recommended)
- B) When the picker first appears (the "you got a special pick!" moment).
- C) Both moments (appear = build-up, reveal = payoff).

[Answer]: B

**Q3.3 — Interaction with Item 2** — if the easter-egg card is epic/legendary (usually is), do both sounds play?
- A) **Easter-egg fanfare takes priority** — play it, skip the big-pull fanfare to avoid clashing. (Recommended)
- B) Layer both.

[Answer]: B

---

## Cadence
**Q4** — LIGHT single increment (all 3 together), consistent with Inc 7–14. OK?
- A) Yes, LIGHT single increment. (Recommended)
- B) Split.

[Answer]: A
