# U2 — Frontend Components (Auth & Profiles)

All interactive elements get stable `data-testid` (automation-friendly rule).

## Component hierarchy
```
app/(auth)/signin/page.tsx        SignInScreen
app/play/page.tsx                 ProfilePicker (post-auth landing)
app/admin/profiles/page.tsx       ProfileManager (parent-only; also surfaced in U7)
components:
  SignInButton
  ProfileCard
  ProfileForm (create/edit)
  SwitchProfileButton
  ConfirmDialog (remove)
```

## SignInScreen
- **Purpose**: Only screen for unauthenticated users (A1).
- **Contains**: `SignInButton` → Auth.js Google sign-in. `data-testid="signin-google-button"`.
- **State**: none (server component + form action).

## ProfilePicker (B1)
- **Purpose**: After sign-in, choose who's playing.
- **Props**: `children: Child[]` (server-loaded).
- **Renders**: grid of `ProfileCard` (large tap targets, avatar emoji + name). `data-testid="profile-card-{childId}"`.
- **Interaction**: tap → server action `setActiveProfile(childId)` → redirect to child home.
- **Also**: link to ProfileManager (parent), sign-out. `data-testid="profile-picker"`.

## ProfileManager (A2, parent-only)
- **Purpose**: CRUD child profiles.
- **Renders**: list of children with edit/remove; `ProfileForm` to add.
- **Interactions**:
  - Add/edit → `ProfileForm` (name input `data-testid="profile-name-input"`, avatar selector `data-testid="avatar-option-{key}"`, submit `data-testid="profile-save-button"`).
  - Remove → `ConfirmDialog` ("This deletes their collection") → `removeChild`. `data-testid="profile-remove-{childId}"`, confirm `data-testid="confirm-remove-button"`.

## SwitchProfileButton
- Always available after sign-in (Q4). `data-testid="switch-profile-button"` → back to ProfilePicker.

## Form validation (U2-BR6)
- Name: required, trimmed, non-empty.
- Avatar: must be a preset key.
- Errors shown inline; submit disabled until valid.

## Server actions used
- `setActiveProfile`, `createChild`, `updateChild`, `removeChild`, `signOut` (all from U2 service; parent-gated where noted).

## Accessibility
- Large tap targets for ProfilePicker (pre-reader friendly).
- Avatar choices are emoji + label; no reliance on reading for the picker.
