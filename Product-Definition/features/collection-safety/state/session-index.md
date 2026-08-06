# Discovery Session Index
- Created / Last Updated: 2026-08-04T22:51:27Z
- Project Type: Feature on existing
- Depth: quick
- Mode: sequential
- Interaction: batch
- Business: complete
- Technical: complete
- Join: done

## Session Metadata
- Scope: Collection safety — "ensure my kids' collections are not deleted by mistake"
- Current Role: Business
- Internal Project Type: Brownfield
- Parent definition: `Product-Definition/vision-document.md` + `technical-environment.md` (approved 2026-08-03, Join: done)
- Traces to: **OQ-B-1** (no known backup/restore path) — highest-priority open question in the parent definition
- Language: English

## Visual Sketch
- Status: ⏭️ Skipped by user choice (2026-08-05). Feature surface is CLI guards + a CI workflow; the only
  UI change is one confirmation dialog on the existing Remove button.

## Relationship to the parent definition
This is a scoped sub-discovery. It does NOT rewrite the approved 2026-08-03 documents. Its outputs live
under `features/collection-safety/` and, on completion, contribute deltas back as:
- a resolution note against OQ-B-1 in the parent `open-questions.md`
- any new invariants for the parent "What Must NOT Change" sections
