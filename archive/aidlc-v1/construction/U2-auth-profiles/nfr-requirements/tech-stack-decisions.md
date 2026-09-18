# U2 Auth & Profiles — Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Auth library | **Auth.js (NextAuth v5)** | Standard for Next.js App Router; handles OAuth state/PKCE, signed cookies. |
| Provider | **Google OAuth** | Per Q17; parent uses their Google account. |
| Authorization | Email **allowlist** (`PARENT_EMAILS`) + `requireParent()` helper | Simple, server-enforced; single-parent (Q1). |
| Active profile | **Signed HTTP-only cookie** `activeChildId` | Per Q3; validated server-side each request. |
| Session storage | Auth.js JWT session (stateless) | No session table needed at this scale. |
| Validation | Zod at action boundaries | Validate profile name/avatar inputs. |
| Profile data | Reuses U1 `children` table | No new tables. |

## New env vars (added to shared-infrastructure.md)
- `AUTH_SECRET` — Auth.js signing secret.
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — Google OAuth app credentials.
- `PARENT_EMAILS` — allowlisted parent email(s), comma-separated.

## Setup notes (for Infra Design / Code Gen)
- Create Google OAuth Client (Authorized redirect URI: `<site>/api/auth/callback/google`).
- Set env in Vercel; `vercel env pull` locally.
