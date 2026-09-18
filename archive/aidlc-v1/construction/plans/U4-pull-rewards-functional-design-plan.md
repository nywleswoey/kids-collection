# U4 Pull & Rewards — Functional Design Plan

**Unit**: U4 Pull Engine & Rewards (core gameplay)
**Stories**: C1 pull, C2 reveal, C3 out-of-tokens, C4 duplicates, F1 grant tokens, F2 see balance
**Depends on**: U1 (logic, schema), U2 (active child + parent guard), U3 (pool reader)
**Extensions**: Security (no double-spend) + PBT — **blocking**.

A couple of correctness decisions before design. Defaults recommended. Answer `[Answer]:` tags, then **/aidlc:approve**.

## Context
The Neon **HTTP** driver (used in U1) doesn't do interactive multi-statement transactions. So the pull's atomic token-spend needs a guard strategy.

## Questions

## Question 1 — Pull atomicity (no double-spend) `[SEC][PBT]`
A) **Conditional atomic UPDATE** — `UPDATE children SET pull_tokens = pull_tokens - 1 WHERE id = ? AND pull_tokens >= 1 RETURNING pull_tokens`. If no row updated → out of tokens (no spend). Then draw + upsert collection. Works with neon-http, prevents double-spend even on rapid taps. (recommended)

B) Switch to Neon WebSocket pool + full transaction (more setup; stronger all-or-nothing)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — If collection upsert fails after the token was spent
A) **Best-effort refund** — attempt to add the token back; if that also fails, log it (rare; family scale) (recommended)

B) Accept the lost token (simplest; very rare)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Parent token grant model (F1) `[PBT]`
A) **Arbitrary amount** — parent enters any positive N to add; plus quick +1/+5 buttons in admin (recommended)

B) Fixed-size grants only (e.g. +1 / +5 / +10 buttons)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Out-of-tokens behavior (C3)
A) **Disable pull + friendly "Ask your parent for more pulls" message** (recommended)

B) Hide the pull button entirely when 0

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Anything else for pull/rewards?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [x] `U4-pull-rewards/functional-design/business-logic-model.md` (pull transaction, grant)
- [x] `U4-pull-rewards/functional-design/business-rules.md`
- [x] `U4-pull-rewards/functional-design/frontend-components.md` (pull button, reveal handoff, balance, admin grant)

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
