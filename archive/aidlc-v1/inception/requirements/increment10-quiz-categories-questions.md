# INCREMENT 10 — Requirements Questions (Quizzes, New Categories, Ticket Fixes)

Scope from your request (6 items):
1. **Bug** — special tickets don't show on child landing page (only see "0 tickets")
2. **UX** — hide "ask parent for tickets" prompt when child has any ticket (normal or special)
3. **UX** — use buttons everywhere instead of text links (e.g. binder)
4. **Feature** — educational quizzes (SG lower-primary math + simple English grammar); teach first, then quiz; all-correct → special ticket
5. **Content** — new category **Country** (card = iconic item of a country)
6. **Content** — new category **Famous People**

Answer each with a letter. Add notes after `[Answer]:` freely.

---

## A. Ticket display bug (item 1)

Landing page (`/play/home`) currently shows only normal pull tickets (`🎟️ N tickets ready`). Epic/lucky special tickets are stored but never shown there.

**A1. What should the landing page show?**
- A) Show all three: normal 🎟️, epic ✨, lucky 🍀 — each with its own pill, hide a type if 0
- B) Show all three always, even if 0
- C) One combined "You have N special tickets" pill + the normal pill
- D) Other

[Answer]: C

---

## B. "Ask parent" prompt (item 2)

On the pull screen, when normal tickets = 0 it shows *"You're out of tickets! Ask your parent for more."* Currently ignores special tickets.

**B1. When should that "ask parent" message be hidden?**
- A) Hide it whenever child has ANY ticket — normal OR epic OR lucky (recommended)
- B) Hide only when normal > 0 (current behaviour, no change)
- C) Other

[Answer]: A

**B2. If child has 0 normal but has special tickets, what shows on the pull screen instead of the ask-parent message?**
- A) The special-egg buttons only (✨/🍀), plus a small "Use your special ticket!" hint
- B) Special-egg buttons + the normal Discover button disabled/greyed
- C) Other

[Answer]: B

---

## C. Buttons vs text links (item 3)

Text links (`link-soft` style) still exist at: binder-card detail back link, and profile-picker admin link. Nav on home/pull/binder already uses button style.

**C1. Scope of the buttons-not-links change?**
- A) Convert ALL user-facing navigation to buttons (recommended) — every `link-soft` text link becomes a `btn`
- B) Only the binder-related links you named
- C) Other

[Answer]: A

---

## D. Educational quizzes (item 4) — the big one

**D1. Which subjects at launch?**
- A) Both Math + English grammar (recommended)
- B) Math only
- C) English grammar only

[Answer]: A

**D2. Quiz length (questions per quiz, all must be correct to earn reward)?**
- A) 3 questions
- B) 5 questions (recommended)
- C) 10 questions
- D) Other: ___

[Answer]: B

**D3. "Teach first" format before the quiz?**
- A) 1 short lesson card (a few sentences + one worked example) then Start Quiz (recommended)
- B) 2–3 lesson slides swipe-through, then Start Quiz
- C) Just a rules blurb, minimal teaching
- D) Other

[Answer]: A

**D4. Reward for all-correct?**
- A) 1 lucky 🍀 special ticket (recommended — easier egg tier)
- B) 1 epic ✨ special ticket (rarer tier)
- C) Child/parent-configurable which
- D) 1 normal 🎟️ pull ticket instead

[Answer]: A

**D5. What if they get one wrong?**
- A) Show which were wrong, let them retry the same quiz, no reward until all correct (recommended)
- B) No retry — must pick a new quiz / try later
- C) Give partial hint and retry only the wrong ones

[Answer]: B

**D6. Reward frequency limit (anti-farming — else kids replay for infinite tickets)?**
- A) Each quiz topic rewards ONCE ever (recommended); replay allowed for fun, no more tickets
- B) One reward per topic per day
- C) Unlimited rewards (every all-correct completion = 1 ticket)
- D) Daily cap of N total quiz tickets: ___

[Answer]: D, 3

**D7. How many quiz topics at launch?** (topic = one lesson + its question bank, e.g. "Addition to 20", "Nouns vs verbs")
- A) ~4 topics (2 math, 2 grammar) to start (recommended)
- B) ~6 topics (3 + 3)
- C) ~8+ topics
- D) Other: ___

[Answer]:  Can they be dynamic? Is there a platform/api i can call to generate this

**D8. Are the questions a fixed hand-authored set, or randomised?**
- A) Hand-authored fixed set per topic, shown in order (simple, predictable) (recommended)
- B) Larger question bank per topic, pick N at random each attempt (more replay value)
- C) Procedurally generated math (e.g. random a+b) + fixed grammar

[Answer]: B

**D9. Where do quizzes live in the app?**
- A) New button on the child home screen "🧠 Play & Learn" → quiz picker (recommended)
- B) Inside My Galaxy
- C) New top-level nav item everywhere

[Answer]: A

**D10. Does earning a quiz reward need parent involvement?**
- A) No — child earns the special ticket directly on all-correct, auto-granted (recommended)
- B) Yes — completion sends a request to parent, parent approves the ticket in admin

[Answer]: A

**D11. Should the admin dashboard show quiz activity (which topics completed, tickets earned)?**
- A) Yes — per-child quiz completion + tickets-earned summary (recommended)
- B) No — keep admin unchanged
- C) Later increment

[Answer]: A

---

## E. New categories (items 5 & 6)

Existing categories are 30 cards each, uniform mix (15 common / 8 rare / 5 epic / 2 legendary), each card AI-image-generated from an `imagePrompt`, with `eduText` (true fact) + `sourceUrl`.

**E1. Card count per new category (Country, Famous People)?**
- A) 30 each, same 15/8/5/2 mix as existing (recommended, consistent)
- B) Fewer (e.g. 15 each) to start
- C) Other: ___

[Answer]: A

**E2. Country category — card content.** You said "iconic item of the country" (not a flag/map). e.g. Japan → Mount Fuji or torii gate, France → Eiffel Tower, Italy → Colosseum.
- A) One iconic landmark/item per country, ~30 countries, kid-recognisable, globally spread (recommended)
- B) Multiple items per country, fewer countries
- C) Other

[Answer]: A

**E3. Country — rarity by fame?** (common = very famous, legendary = lesser-known/exotic)
- A) Yes, assign rarity by how well-known the country/item is (recommended)
- B) Random assignment, doesn't matter
- C) Other

[Answer]: A

**E4. Famous People category — who's in scope?** (kid-appropriate, educational)
- A) Historical + inspiring figures across fields — scientists, explorers, artists, athletes, leaders (e.g. Einstein, Marie Curie, Neil Armstrong) (recommended)
- B) Only historical (no living people)
- C) Include some SG figures (e.g. Lee Kuan Yew, local athletes) alongside global
- D) Other

[Answer]: A

**E5. Should either new category lean Singapore-context** (like the quizzes)?
- A) Country = global spread; Famous People = global + a few SG figures (recommended)
- B) Both fully global, no SG emphasis
- C) Both include SG emphasis
- D) Other

[Answer]: A

**E6. New category cards use the same `eduText` fact + `sourceUrl` pattern?**
- A) Yes — true fact + source link per card, same as existing (recommended)
- B) Other

[Answer]: A

---

## F. Sequencing

**F1. Deliver all 6 items in one increment, or split?**
- A) One increment (INCREMENT 10), all 6 (recommended)
- B) Fixes + categories now (items 1,2,3,5,6); quizzes (item 4) as a separate follow-up increment
- C) Quizzes first, rest later
- D) Other

[Answer]: B

**F2. Image generation note:** new categories need ~60 AI-generated card images (30 Country + 30 Famous People) via the existing seed pipeline (costs API time/tokens; runs locally with `pnpm seed`). Acknowledge?
- A) Yes, generate images for both new categories (recommended)
- B) Country only for now
- C) Use placeholder images first, generate later

[Answer]: A
