# U7 Admin — Functional Design Plan

**Unit**: U7 Admin (final unit)
**Stories**: A2 (manage profiles — base built in U2), G1 (view all collections + balances), F1 (token-grant **UI** — grant service already exists from U4)
**Depends on**: U2 (guard, profile CRUD), U4 (grant service), U5 (collection reads). **Security blocking** (parent-only).

Defaults recommended. Answer `[Answer]:` tags, then **/aidlc:approve**.

## What's already done vs new
- **Done (U2)**: `/admin/profiles` — add/edit/remove child profiles.
- **New in U7**: token-grant UI (wire `grantTokensAction`), and an oversight view (each child's balance + collection progress).

## Questions

## Question 1 — Token-grant UI placement (F1)
A) **Inline on `/admin/profiles`** — each child row gets a grant control (number input + quick +1/+5) (recommended; one admin screen)

B) Separate `/admin/rewards` page

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Oversight view (G1)
A) **Admin dashboard `/admin`** — table of children: avatar, name, token balance, overall progress (owned/total); link into each child's binder view (read-only) (recommended)

B) Just show balances (no collection stats)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Pool overview
A) **Minimal**: show theme + card counts on the admin dashboard (recommended)

B) Full pool browser (view all cards)

C) Skip for v1

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Quick-grant amounts
A) **+1 and +5 buttons** plus a custom number input (recommended)

B) Different amounts (specify)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Anything else for admin?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [x] `U7-admin/functional-design/business-logic-model.md` (admin reads + grant wiring)
- [x] `U7-admin/functional-design/business-rules.md` (authz)
- [x] `U7-admin/functional-design/frontend-components.md` (dashboard, grant controls, oversight)

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
