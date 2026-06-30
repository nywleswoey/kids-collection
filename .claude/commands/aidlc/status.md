---
description: Show AI-DLC workflow status (read-only, does not advance)
---

Report the current AI-DLC workflow status. This is **read-only** — do NOT execute any stage, write any file, or advance the workflow.

1. Read `aidlc-docs/aidlc-state.md`. If missing, say no AI-DLC project exists yet and suggest `/aidlc:start`.
2. Summarize concisely:
   - **Project** and **current phase** (INCEPTION / CONSTRUCTION / OPERATIONS)
   - **Current stage** and last completed step
   - **Stages executed** vs **stages skipped** (with the recorded reason for skips)
   - **Open plan checkboxes** — scan the active plan file under `aidlc-docs/{phase}/plans/` and list unchecked `[ ]` items
   - **Extension configuration** — enabled/disabled extensions from `## Extension Configuration`
   - **Next step**
3. Do not modify `aidlc-state.md`, `audit.md`, or any plan file.

Keep it to a short scannable summary.
