# U2 Auth & Profiles — Infrastructure Design

U2 adds **no new managed services** — runs on the shared stack (see `construction/shared-infrastructure.md`). It adds an external **Google OAuth application** and auth env vars.

> No open questions — provider + approach fixed.

## External identity provider
| Item | Detail |
|---|---|
| **Google OAuth Client** | Created in Google Cloud Console (OAuth consent + credentials). |
| Authorized redirect URI | `https://<prod-domain>/api/auth/callback/google` (+ preview/localhost URIs for dev). |
| Scopes | `openid email profile` (email used for allowlist). |

## Env vars (added to shared registry)
| Var | Purpose |
|---|---|
| `AUTH_SECRET` | Auth.js session signing. |
| `AUTH_GOOGLE_ID` | Google OAuth client id. |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret. |
| `PARENT_EMAILS` | Allowlisted parent email(s). |

All set in Vercel env; pulled locally via `vercel env pull`.

## Compute / routing
- Auth handled in Vercel Functions (Auth.js route handler at `app/api/auth/[...nextauth]/route.ts`). No separate auth service.
- Profile CRUD via Server Actions on the same app.
- Cookies set by the app (HTTP-only, Secure in prod).

## Monitoring
- Vercel function logs for auth callbacks/errors. No extra tooling.

## Cost
- Google OAuth: free. No new paid infra.
