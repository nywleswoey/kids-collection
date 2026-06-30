# U2 Auth & Profiles — Functional Design Plan

**Unit**: U2 Auth & Profiles
**Stories**: A1 (Google sign-in), A2 (manage child profiles), B1 (profile picker)
**Security extension: blocking** — authz is central here.

A few decisions before generating the design (defaults recommended). Answer `[Answer]:` tags, then **/aidlc:approve**.

## Proposed shape (defaults)
- **Auth.js (NextAuth v5)** with Google provider.
- Parent access gated by an **email allowlist** (`PARENT_EMAILS`, comma-separated).
- After sign-in → child **profile picker**; selected child stored in a **signed/HTTP-only cookie** (`activeChildId`), validated server-side on every child-scoped read/action.
- Profile CRUD (name + preset avatar) is **parent-only**.

## Questions

## Question 1 — Parent allowlist scope `[SEC]`
A) **Single parent email** (just yours) (recommended — simplest)

B) A few allowlisted emails (you + partner) — comma-separated in `PARENT_EMAILS`

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Auth library
A) **Auth.js (NextAuth v5)** Google provider (recommended; standard for Next.js)

B) Other (describe)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Active-profile session mechanism
A) **Signed HTTP-only cookie** `activeChildId`, validated server-side (recommended)

B) URL-scoped (`/play/[childId]/...`) with server authz check

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Switching child profile
A) **Easy switch** — a "switch profile" control always available after sign-in (recommended; shared family device)

B) Lock to one profile per session until sign-out

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Profile removal
A) **Confirm + cascade** — removing a child warns it deletes their collection, then cascades (recommended; matches A2/BR14)

B) Soft-delete (hide, keep data)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6 — Anything else for auth/profiles?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [x] `U2-auth-profiles/functional-design/domain-entities.md` (auth/session view; children already in U1)
- [x] `U2-auth-profiles/functional-design/business-rules.md` (authz rules)
- [x] `U2-auth-profiles/functional-design/business-logic-model.md`
- [x] `U2-auth-profiles/functional-design/frontend-components.md` (sign-in, profile picker, profile manager)

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
