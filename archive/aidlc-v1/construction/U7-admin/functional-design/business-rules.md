# U7 — Business Rules (Admin)

`[SEC]` Security blocking. Everything parent-only.

## Access
- **U7-BR1** `[SEC]` All admin routes/actions require `requireParent()`; a child profile session cannot reach `/admin/*`.
- **U7-BR2** `[SEC]` Admin never exposes secrets or other families' data (single-family; allowlisted parent only).

## Oversight (G1)
- **U7-BR3** Dashboard shows every child's balance + overall progress (owned distinct / total).
- **U7-BR4** Parent can open any child's binder read-only (no mutation from admin view).
- **U7-BR5** Pool summary shows theme + card counts.

## Rewards (F1)
- **U7-BR6** `[SEC][PBT]` Grant is parent-only; adds a positive integer; balance stays ≥ 0 (reuses U4 rules).
- **U7-BR7** Quick +1/+5 and a custom amount are available per child.
- **U7-BR8** After a grant, the displayed balance updates.

## Profiles (A2)
- **U7-BR9** Create/edit/remove reused from U2 (parent-only, cascade delete on remove).

## Consistency
- **U7-BR10** All numbers (balance, progress, counts) derive from the same services as the rest of the app (no separate source of truth).
