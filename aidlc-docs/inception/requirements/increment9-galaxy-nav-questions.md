# INCREMENT 9 — Galaxy Navigation & Prominent Category Pick: Questions

Fill each `[Answer]:` with a letter. Notes welcome.

Context: galaxy (`/play/binder`) stacks every theme section vertically (long scroll as categories grow). Header is already sticky (Inc7). Pull screen category picker is a `<select>` that hides once a card is revealed.

---

## Q1 — Better galaxy category view (item 1): primary pattern?
- A) **Sticky category tab bar** — chips/tabs at top; tap one to filter the galaxy to that category (a "★ All" chip shows everything) *(recommended — scales, one category at a time)*
- B) **Jump-to nav** — sticky chips that scroll-jump to each theme section (all still rendered, stacked)
- C) **Collapsible sections** — each category is an accordion, collapsed by default, expand to view
- D) Other (notes)

[Answer]: A

---

## Q2 — Default view when opening the galaxy (if Q1=A tabs)
- A) **"All" selected** — show every category (current behavior), tabs let them narrow *(recommended)*
- B) First category selected by default

[Answer]: A

---

## Q3 — "Make the galaxy menu sticky" (item 2)
The header (Home + title + star count) is already `sticky`. What did you mean?
- A) Add the **new category tab bar** (Q1) and make **that** sticky under the header *(recommended — this is the menu that matters when scrolling)*
- B) The existing header sticky is broken/not sticky enough — fix/strengthen it
- C) Both

[Answer]: A

---

## Q4 — Prominent category pick on pull (item 3): style?
Kids missed the dropdown. Replace with:
- A) **Big tappable category chips/buttons** (incl. 🎲 Random), selected one highlighted, shown above the Discover button *(recommended — obvious, tap-friendly)*
- B) Keep a dropdown but make it larger with a clear "Choose a galaxy" label
- C) Other (notes)

[Answer]: A

---

## Q5 — Change category from the result view (item 3, second part)
After a card is revealed, to pull again:
- A) **Keep the category chips visible** above the result so they can switch before the next Discover *(recommended)*
- B) Show a compact "Category: X — change" control on the result view
- C) Other (notes)

[Answer]: A

---

## Q6 — Should the chosen category persist across pulls this session?
- A) **Remember the last pick** while on the pull screen (so consecutive pulls keep the category until they change it) *(recommended — matches "change it from that view")*
- B) Reset to 🎲 Random after every pull

[Answer]: A

---

---

# Item 4 — Special egg tickets (new requirement)
Grant tickets that guarantee a specific easter egg (bypass the ~1% roll). Two eggs exist: **epic+ pick** and **common/rare pick**.

## Q8 — Which special ticket types?
- A) **Two** — one per egg: ✨ Epic+ ticket, 🍀 Lucky (common/rare) ticket *(recommended)*
- B) One generic "egg ticket" that fires a random one of the two eggs
- C) Other (notes)

[Answer]: A

## Q9 — How does a child spend a special ticket on the pull screen?
- A) **Separate labelled buttons** appear when the child has that ticket (e.g. "✨ Epic Pick (2)"), tapping it runs that egg's pick-1-of-5 flow guaranteed *(recommended)*
- B) Auto-consumed before a normal pull if any special ticket is held
- C) Other (notes)

[Answer]: A

## Q10 — Cost when spending a special egg ticket
- A) Costs **one special ticket** only (no normal ticket) — the guaranteed-egg equivalent of a discover *(recommended)*
- B) Costs one special ticket **and** one normal ticket

[Answer]: A

## Q11 — Where does the parent grant special tickets?
- A) **Admin dashboard**, next to the existing 🎟️ grant control — add +/- per ticket type *(recommended, reuses grant UI)*
- B) A separate admin screen

[Answer]: A

Note: implementation needs a schema migration (new per-type ticket columns on children). Eggs keep the existing signed-offer + atomic-claim security; special-ticket spend is atomic (no double-spend).

---

## Q7 — Scope
Ship all **4 items** as **INCREMENT 9 (LIGHT)**?
- A) Yes, all together *(recommended)*
- B) Split (notes)

[Answer]: A
