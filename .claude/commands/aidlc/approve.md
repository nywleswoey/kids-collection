---
description: Approve the current AI-DLC stage gate and proceed
argument-hint: [optional note or conditions]
---

The user approves the current AI-DLC stage to proceed. Optional note: $ARGUMENTS

1. Read `aidlc-docs/aidlc-state.md` to confirm which stage is awaiting approval. If nothing is pending approval, say so and do not advance.
2. If a question file for this stage has unanswered `[Answer]:` tags, do NOT proceed — point the user to it first.
3. Append the approval to `aidlc-docs/audit.md` (append-only, ISO 8601 timestamp): capture the user's raw input ("$ARGUMENTS" or "approved"), the AI action, and stage context.
4. Mark the completed plan steps `[x]` in the active plan file, and update the stage status in `aidlc-state.md` — in the SAME interaction.
5. Before enforcing any extension at the next stage, check its `Enabled` status in `## Extension Configuration`; skip disabled ones and log the skip.
6. Proceed to the next stage per `CLAUDE.md`, loading the relevant rule-detail file(s) for that stage. Use the standardized 2-option completion message — do NOT invent 3-option menus.
7. Stop at the next approval gate.
