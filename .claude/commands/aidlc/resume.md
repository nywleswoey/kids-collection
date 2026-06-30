---
description: Resume an in-progress AI-DLC workflow from saved state
---

Resume the existing AI-DLC workflow. Follow `CLAUDE.md` and the session-continuity rules.

1. Read `aidlc-docs/aidlc-state.md` first. If it is missing, tell the user there is no project to resume and to run `/aidlc:start <intent>`.
2. Resolve the rule-details directory and load `common/session-continuity.md`.
3. Parse current status: project name, current phase, current stage, last completed step, next step.
4. Load previous-stage artifacts per the "Smart Context Loading by Stage" rules in `common/session-continuity.md` (load only what the current stage needs; for per-unit stages load the in-progress unit's artifacts plus its dependencies).
5. Render the "Welcome back" prompt with the parsed status and concrete next-step options (A/B), per the session-continuity template.
6. Give a brief summary of which artifacts were loaded.
7. Log the continuity prompt to `aidlc-docs/audit.md` (append-only).

Do NOT re-display the full welcome message. Wait for the user's choice before advancing.
