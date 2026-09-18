# Security Test Instructions

Security extension is **blocking**. Validate the key controls.

## Checks

### Authentication / Authorization
- [ ] `/play/*` and `/admin/*` redirect to `/signin` when unauthenticated (middleware + `requireParent`).
- [ ] Non-allowlisted Google account cannot obtain access (signIn callback denies).
- [ ] Token grant + profile CRUD reject non-parent contexts.
- [ ] A child session cannot open `/admin/*`.

### Data scope
- [ ] Binder/card-detail resolve the child from the server cookie; a child sees only their own collection.
- [ ] Card detail returns nothing for cards the child doesn't own.

### Pull integrity
- [ ] No double-spend under concurrent pulls (conditional `WHERE pull_tokens >= 1`).
- [ ] Balance never negative (DB check constraint + `GREATEST(0, …)`).

### Secrets / injection
- [ ] All secrets in env only (not in client bundle / repo). `.env*` gitignored.
- [ ] All DB access via Drizzle (parameterized) — no string-built SQL.
- [ ] Cookies HTTP-only + Secure (prod) + signed session (Auth.js).

### Content safety (kids)
- [ ] Only reviewed, pre-generated images/text reach children (seed review gate).

## Dependency scan
```bash
pnpm audit          # review advisories
```

## Notes
- Automated coverage: allowlist (unit), spend model (unit). Authz/scope checks are manual/integration for v1.
