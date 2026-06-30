/** Pure parent-allowlist policy (no I/O) — property-tested. */

/** Parse a comma-separated allowlist into normalized emails. */
export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/** True iff `email` is in `allowlist` (case-insensitive, trimmed). */
export function isParentEmail(
  email: string | null | undefined,
  allowlist: string[],
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return allowlist.includes(normalized);
}
