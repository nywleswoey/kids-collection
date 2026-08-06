# Technical State
- Status: complete — approved by user 2026-08-05 (artefact-verification gate passed)
- Depth: quick
- Scope: Collection safety (accidental-deletion protection)

## Questions
- [x] T1 [CORE] — Where the backup job runs — **a**, GitHub Actions scheduled workflow
- [x] T2 [CORE] — Storage and retention — **a**, Actions artifacts, 90-day default
- [x] T3 [CORE] — Schedule / RPO — **a**, daily overnight; RPO 24h (+ `workflow_dispatch` assumed)
- [x] T4 [CORE] — Neon PITR — **a**, verified: **6-hour** retention window
- [x] T5 [CORE] — Verified restore — **c**, automated restore-and-assert in the workflow
- [x] T6 [CORE] — Destructive-command guard — **d**, host detection + typed confirmation
- [x] T7 [CORE] — Holding the `resetPool()` split — **d**, test + "What Must NOT Change" entry

## Pre-declared open questions
- OQ-CS-4 — backups and source share one vendor and one GitHub account (single point of failure)
- Carried: OQ-CS-2 (soft-delete deferred), OQ-CS-3 (general delete-path PBT deferred)

## Assumptions adopted (not user-confirmed)
- `workflow_dispatch` included on the backup workflow, so a dump can be taken on demand before running
  anything destructive. T3's sub-question went unanswered; adopted as the cheap, additive default.
