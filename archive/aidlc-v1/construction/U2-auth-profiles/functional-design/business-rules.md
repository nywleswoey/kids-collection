# U2 — Business Rules (Auth & Profiles)

`[SEC]` Security extension (blocking). Authz enforced server-side, never trusted from client.

## Authentication (A1)
- **U2-BR1** `[SEC]` Unauthenticated users see only the sign-in screen; all other routes/actions redirect to sign-in.
- **U2-BR2** `[SEC]` A Google session grants parent access **iff** its email ∈ `PARENT_EMAILS` allowlist (case-insensitive, trimmed). Non-allowlisted authenticated users get no access (no profiles, no admin).
- **U2-BR3** `[SEC]` Allowlist + auth checks run server-side (`requireParent()`); client values never grant access.
- **U2-BR4** Sign-out clears the session and the `activeChildId` cookie.

## Profiles (A2)
- **U2-BR5** `[SEC]` Create/edit/remove child profile is parent-only (`requireParent()`).
- **U2-BR6** Child name non-empty; avatar must be a valid preset key (`isValidAvatar`).
- **U2-BR7** Removing a child requires explicit confirmation; on confirm, cascade-deletes the child and their collection entries (BR14).

## Active profile / scoping (B1)
- **U2-BR8** After sign-in, the user picks a child profile; `activeChildId` is set in a signed HTTP-only cookie.
- **U2-BR9** `[SEC]` Every child-scoped read/action resolves the child **from the cookie server-side** and verifies it exists; a child only ever sees their own data (Story B1, BR scope).
- **U2-BR10** Switching profile is allowed anytime after sign-in (updates the cookie).
- **U2-BR11** `[SEC]` If `activeChildId` is missing/invalid, child-scoped pages redirect to the profile picker (no data leak).

## Notes
- No child-level passwords (Q1 model): the parent's Google login is the only auth boundary; profile selection is a non-secret convenience after that boundary.
