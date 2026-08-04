# Technical State
- Status: complete

## Role Progress
- Technical (Technical Env Doc): ✅ Complete (approved 2026-08-03T11:29:25Z)
- Artefacts: `technical-environment.md` (rendered + validated), `open-questions.md` (OQ-T-2, OQ-T-3)

## Open Questions
- Last Compiled: 2026-08-03T11:16:45Z
- Business: 3 open (OQ-B-1..3)
- Technical: 2 open (OQ-T-2, OQ-T-3) — OQ-T-1 resolved this session, number not reused
- Next Index: {business: 4, technical: 4}

## Cross-role check (QB2 vs TB2)
- Performed 2026-08-03T11:16:45Z — **NO CONTRADICTIONS**. TB2 is a strict technical superset of QB2.
  Detail in `interview/technical/tech-env-answers-history.md`.
- Depth: full
- Pre-fill: enabled (sources = v1 `aidlc-docs/` + the repo itself)

## Session Metadata
- Technical Depth: Full
- Project Type: Brownfield (B — New feature on existing)
- Total questions: 33 (T1–T29 + TB1–TB4)
- Batch plan: 5 batches — T1–T7, T8–T14, T15–T21, T22–T27, T28–TB4

## Technical Questions

### Section T1: Project Technical Summary — COMPLETE (2026-08-03T09:36:44Z)
- [x] T1 [CORE]: Runtime environment (cloud / on-prem / hybrid)
- [x] T2 [CORE]: Cloud provider
- [x] T3 [CORE]: Deployment model
- [x] T4: Team size and experience

### Section T2: Programming Languages — COMPLETE (2026-08-03T09:36:44Z)
- [x] T5 [CORE]: Required languages (with versions)
- [x] T6: Permitted languages
- [x] T7 [CORE]: Prohibited languages (with reasons)

**OQ-T-1 — RESOLVED (2026-08-03T10:35:08Z)**: user chose enforcement. `tsconfig.json` changed to
`"allowJs": false`; `pnpm typecheck` exit 0. The T7 JavaScript prohibition is now an enforced mechanism.
Do NOT carry to open-questions.md. (Unit tests not run — user declined that command.)

## Repository changes made during this interview
- `tsconfig.json`: `"allowJs": true` → `"allowJs": false` (2026-08-03T10:35:08Z, user-directed).
  Verified: no `.js`/`.jsx` source exists outside node_modules/.next/.claude; typecheck clean.

### Section T3: Frameworks and Libraries — COMPLETE (2026-08-03T10:35:08Z)
- [x] T8 [CORE]: Required frameworks
- [x] T9: Preferred frameworks
- [x] T10 [CORE]: Prohibited libraries (reason + alternative)

### Section T4: Cloud Services — COMPLETE (2026-08-03T10:35:08Z)
- [x] T11: Allow-list services
- [x] T12: Disallow-list services

### Section T5: Architecture and Patterns
- [x] T13 [CORE]: API style
- [x] T14 [CORE]: Data patterns
- [x] T15: Messaging / integration patterns
- [x] T16: Project structure conventions
  *(Section T5 COMPLETE — 2026-08-03T11:06:20Z)*

### Section T6: Security — COMPLETE (2026-08-03T11:06:20Z)
- [x] T17 [CORE]: Authentication method
- [x] T18: Encryption at rest and in transit
- [x] T19: Input validation approach
- [x] T20 [CORE]: Secrets management
- [x] T21: Compliance framework chosen

**Recorded gaps (not blocking, carried into the technical-environment doc)**
- T19: Zod does not cover every Server Action argument — most inputs are authorized, not schema-checked.
- T18: at-rest encryption is INFERRED from managed-platform behaviour, not repo-verifiable.
- T21: "no framework applies" holds only while the app stays private (COPPA/AADC if ever public).

### Section T7: Testing — COMPLETE (2026-08-03T11:12:15Z)
- [x] T22 [CORE]: Test types required
- [x] T23: Coverage targets
- [x] T24: Tooling per test type
- [x] T25: CI/CD gates — **reading (ii): intent to automate, deferred by user**

### Section T8: Example Code Patterns
- [x] T26: Example endpoint pattern
- [x] T27: Example function / module pattern
- [x] T28: Example test pattern
- [x] T29: Example infrastructure snippet
  *(Section T8 COMPLETE — 2026-08-03T11:16:45Z)*

**OQ-T-2 (open)**: CI gates declared as intent (typecheck + test + build, plus test:pg on persistence
changes) but no `.github/workflows/` exists. Until automated, the BLOCKING Property-Based Testing
constraint is enforced only by developer discipline. User deferred: "will automate later on."

### Existing System (project type B) — COMPLETE (2026-08-03T11:16:45Z)
- [x] TB1 [CORE]: Existing stack inventory
- [x] TB2 [CORE]: What must stay unchanged
- [x] TB3 [CORE]: Prohibited patterns
- [x] TB4: Source of example code

## Carried from the Business role (must be reflected as constraints)
- $0/month runtime cost cap (Q9/Q10) → deny-list anything with recurring spend.
- Kid-safety inviolable (Q9) → no runtime generation into a child-facing surface.
- Security Baseline: BLOCKING. Property-Based Testing: BLOCKING. Resiliency: directional.
- Explicit non-goals (Q15): no scalability target, no uptime SLO. Record as non-goals so nothing
  is over-engineered for load or availability that will never be needed.
- QB2 invariants are hard boundaries — TB2 must not contradict them.
