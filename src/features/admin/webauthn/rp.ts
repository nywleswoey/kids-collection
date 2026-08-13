/**
 * WebAuthn Relying Party resolution (parent-gate-auth, OQ-PG-6). PURE — the host
 * and configured rpID are injected so this stays testable.
 *
 * Two facts drive the shape of this module:
 *
 * 1. A passkey is bound to its `rpID`. Production is `kids-collection.vercel.app`,
 *    and `vercel.app` is on the Public Suffix List — so the rpID must be that
 *    EXACT host. `vercel.app` is not a legal rpID and no subdomain sharing is
 *    available. Vercel preview deployments therefore get a hostname no enrolled
 *    passkey can ever match.
 * 2. `localhost` is a valid rpID: WebAuthn treats it as a secure context, so dev
 *    works without TLS.
 *
 * Hence `passkeyRp()` returns **null** whenever the request host is not the
 * configured rpID. That is not a fallback — it is the mechanism that makes the
 * "previews use Google re-auth instead" decision work. Without it a preview
 * deployment would try to register a passkey against a throwaway hostname.
 */

/** Shown by the authenticator/password manager when prompting. */
export const RP_NAME = "Kids Collection";

export interface RpConfig {
  rpID: string;
  rpName: string;
  /** Exact origin string WebAuthn will be asked to expect. */
  origin: string;
}

/**
 * Resolve the RP for this request, or null if passkeys are not available on this
 * host (preview deployments, or any hostname other than the configured rpID).
 *
 * `host` is the raw Host header, which may carry a port (`localhost:3000`).
 */
export function passkeyRp(rpID: string, host: string | null | undefined): RpConfig | null {
  if (!rpID || !host) return null;

  // Host may be "example.com" or "localhost:3000"; rpID never carries a port.
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname !== rpID.toLowerCase()) return null;

  // Dev runs over plain http on localhost (the one origin WebAuthn allows to);
  // everywhere else the origin is https and the port is implicit.
  const origin = hostname === "localhost" ? `http://${host}` : `https://${rpID}`;

  return { rpID, rpName: RP_NAME, origin };
}
