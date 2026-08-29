/**
 * Server-only environment access. Fails fast if a required var is missing.
 * Never import this from a client component.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Server-only environment variables with validation. */
export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get blobToken(): string {
    return required("BLOB_READ_WRITE_TOKEN");
  },
  /**
   * HMAC secret for signed offers and the admin gate cookie. Falls back to ""
   * (rather than throwing) so signature verification simply fails on a missing
   * secret instead of crashing the request.
   */
  get authSecret(): string {
    return process.env.AUTH_SECRET ?? "";
  },
  /**
   * WebAuthn Relying Party ID for the admin gate — the EXACT hostname passkeys
   * are bound to (`kids-collection.vercel.app` in production). Defaults to
   * `localhost` for local dev, which WebAuthn accepts as a secure context.
   *
   * Any request whose host is not this value has no passkey path at all; see
   * `features/admin/webauthn/rp.ts`.
   */
  get webauthnRpId(): string {
    // `||`, not `??`: the variable is present-but-empty in `.env.example`, and an
    // empty rpID matches no host at all — it would disable passkeys silently for
    // anyone who copied that file rather than falling back to the dev default.
    return process.env.WEBAUTHN_RP_ID || "localhost";
  },
};
