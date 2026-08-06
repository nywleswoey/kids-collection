# Business State
- Status: complete — approved by user 2026-08-05T11:06:29Z (artefact-verification gate passed)
- Depth: quick
- Scope: Collection safety (accidental-deletion protection)

## Questions
- [x] Q1 [CORE] — What must never be lost, and what recovery guarantee — **c**; backup scope amended
      2026-08-05 to a **full DB dump** (all tables, no allowlist)
- [x] Q2 [CORE] — Verdict per deletion vector — V1 block · V2 guard · V3 guard · V4 guard · V5 recover
- [x] Q3 [CORE] — Is deleting a child profile ever legitimate — **b**, soft-delete (deferred past slice 1)
- [x] Q4 [CORE] — Success criterion — **d** (A + C)
- [x] Q5 [CORE] — Scope IN — 6 of 8 items; soft-delete + PBT deferred
- [x] Q6 [CORE] — Scope OUT — all six candidates out of scope
- [x] Q7 [CORE] — Cost and effort ceiling — **a**, strictly $0, fully automated

## Pre-declared open questions
- ~~OQ-CS-1 — `quizCompletions` / `collectionRewards` not named as irreplaceable (Q1)~~
  **RESOLVED 2026-08-05** — backup scope is a full DB dump; every table is covered by consequence.
  Number not reused.
- OQ-CS-2 — soft-delete is the decided design but is not in the first slice (Q3 vs Q5)
- OQ-CS-3 — the V4 structural test is unticked, yet Q4(C) and the parent's blocking-PBT rule both want it
