---
description: Start a new AI-DLC workflow for the given intent
argument-hint: <what you want to build or change>
---

The user is starting an AI-DLC workflow. Treat the rest of this message as a request prefixed with **"Using AI-DLC, "**:

Using AI-DLC, $ARGUMENTS

Follow the AI-DLC workflow defined in `CLAUDE.md` exactly. Specifically:

1. Resolve the rule-details directory (first that exists): `.aidlc/aidlc-rules/aws-aidlc-rule-details/`, `.aidlc-rule-details/`, `.kiro/aws-aidlc-rule-details/`, `.amazonq/aws-aidlc-rule-details/`.
2. Load the mandatory common rules: `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`, `common/question-format-guide.md`.
3. Scan `extensions/` and load ONLY `*.opt-in.md` files (defer full rule files until opt-in).
4. If `aidlc-docs/aidlc-state.md` already exists, do NOT restart — tell the user to run `/aidlc:resume` instead.
5. Otherwise display the welcome message from `common/welcome-message.md` ONCE, then begin the INCEPTION phase: Workspace Detection → Requirements Analysis.
6. Ask all clarification questions by writing them to `.md` files (never inline), per `common/question-format-guide.md`.
7. Initialize `aidlc-docs/aidlc-state.md` and `aidlc-docs/audit.md`; append every interaction to `audit.md` (never overwrite).

Stop at the first approval gate and wait for the user.
