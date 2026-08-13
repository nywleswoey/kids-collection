# Discovery Session Index
- Created / Last Updated: 2026-08-12T23:23Z
- Project Type: Feature on existing
- Depth: quick
- Mode: sequential
- Interaction: batch
- Business: complete
- Technical: complete
- Join: done

## Session Metadata
- Scope: Parent gate auth — "can I use something other than a PIN for parent login? biometric perhaps"
- Scope boundary (user-confirmed 2026-08-12): **admin passcode gate only**. The Google OAuth login at
  `/signin` and the parent allowlist are OUT of scope and must keep working unchanged.
- Current Role: Join (Business closed 23:14Z, Technical closed 23:23Z)
- Internal Project Type: Brownfield
- Parent definition: `Product-Definition/vision-document.md` + `technical-environment.md`
  (approved 2026-08-03, Join: done)
- Traces to: **OQ-T-3** (`next-auth` pinned to `5.0.0-beta.25` on the only security boundary). That entry
  says "no action until auth-adjacent work is planned" — this discovery **is** that auth-adjacent work,
  so OQ-T-3 must be revisited in the technical role.
- Language: English

## Visual Sketch
- Status: ⏭️ Skipped by user choice (2026-08-12). The UI surface is one replaced form (password input →
  passkey button) plus one new enrolment route; the ceremony itself is a browser/1Password prompt that
  cannot be styled.

## Relationship to the parent definition
Scoped sub-discovery. Does NOT rewrite the approved 2026-08-03 documents. Outputs live under
`features/parent-gate-auth/` and, on completion, contribute deltas back as:
- a resolution or re-scoping note against OQ-T-3 in the parent `open-questions.md`
- any new invariants for the parent "What Must NOT Change" sections (the gate is named in
  `vision-document.md:269` — "Admin actions stay behind the passcode gate")
