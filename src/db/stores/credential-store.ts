import type { AdminCredentialRow } from "@/db/schema";

/** A newly enrolled passkey, before the row exists. */
export interface NewAdminCredential {
  /** Google account `sub` of the owning parent. */
  parentId: string;
  /** base64url credential id from the authenticator. */
  credentialId: string;
  /** base64url COSE public key. */
  publicKey: string;
  counter: number;
  /** AuthenticatorTransport hints; stored comma-joined. */
  transports: string[];
  label: string;
}

/**
 * AdminCredentialStore — the persistence port for admin gate passkeys
 * (parent-gate-auth). Services accept this instead of the `db` singleton so the
 * WebAuthn orchestration is unit-testable without a database.
 *
 * Two adapters: `pgAdminCredentialStore` (prod) and `inMemoryAdminCredentialStore`
 * (tests), kept honest by the shared contract suite.
 */
export interface AdminCredentialStore {
  /** Every credential for a parent, newest enrolment first. */
  listByParent(parentId: string): Promise<AdminCredentialRow[]>;

  /** One credential by its base64url credential id, or null. */
  findByCredentialId(credentialId: string): Promise<AdminCredentialRow | null>;

  /**
   * Enrol a credential. Rejects a duplicate `credentialId` (the unique index is
   * the race backstop) by returning null rather than throwing, so the caller can
   * report "already enrolled" without inspecting driver errors.
   */
  create(data: NewAdminCredential): Promise<AdminCredentialRow | null>;

  /**
   * Record a successful assertion: bump the stored counter and stamp
   * `lastUsedAt`. No-op for an unknown credential id.
   *
   * The counter is stored, never enforced — synced passkey providers always
   * report 0. See the schema comment on `adminCredentials`.
   */
  recordUse(credentialId: string, counter: number, usedAt: Date): Promise<void>;

  /** Delete a credential by row id. */
  remove(id: string): Promise<void>;
}
