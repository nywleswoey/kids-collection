# U7 Admin — NFR Requirements

Parent-only admin over existing services. No new infra; no open questions.

## Security `[blocking]`
- **U7-SEC-1** All `/admin/*` routes + actions require `requireParent()` (server-side); child sessions blocked.
- **U7-SEC-2** Grant reuses U4 parent-only, integer, non-negative rules.
- **U7-SEC-3** Read-only oversight — admin views never mutate collections/tokens except via the explicit grant action.

## Performance
- **U7-PERF-1** Dashboard: one child list + a light per-child owned-count query + pool counts. Prefer `COUNT`/aggregate over loading full binders. Trivial at family scale.

## Accessibility
- **U7-A11Y-1** Responsive table (stacks on phone); progress as text + bar; large grant buttons.

## Reliability
- **U7-REL-1** Grant failures surface a friendly error; balance refreshes to the true value.

## Testability
- **U7-TEST-1** Admin authz (non-parent blocked) integration-tested; grant behavior already property-tested (U4).
