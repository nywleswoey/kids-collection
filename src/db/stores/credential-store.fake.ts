import type { AdminCredentialRow } from "@/db/schema";
import type { AdminCredentialStore, NewAdminCredential } from "./credential-store";

/** Seed rows may set any columns; unset ones take the schema defaults. */
export type AdminCredentialSeed = Array<
  Partial<AdminCredentialRow> & { parentId: string; credentialId: string }
>;

function row(
  seq: number,
  r: Partial<AdminCredentialRow> & { parentId: string; credentialId: string },
): AdminCredentialRow {
  return {
    id: r.id ?? `cred${seq}`,
    parentId: r.parentId,
    credentialId: r.credentialId,
    publicKey: r.publicKey ?? `pk-${r.credentialId}`,
    counter: r.counter ?? 0,
    transports: r.transports ?? "",
    label: r.label ?? "Test key",
    // Ordering is by createdAt DESC; stagger seeds so the order is deterministic
    // without the fake needing a clock.
    createdAt: r.createdAt ?? new Date(seq * 1000),
    lastUsedAt: r.lastUsedAt ?? null,
  };
}

/**
 * In-memory AdminCredentialStore. `listByParent` returns newest-enrolment-first
 * (matching the pg `createdAt DESC` order) and `create` refuses a duplicate
 * credential id, mirroring the unique index. Kept honest by the shared contract
 * suite.
 */
export function inMemoryAdminCredentialStore(
  seed: AdminCredentialSeed = [],
): AdminCredentialStore {
  let seq = 0;
  const rows: AdminCredentialRow[] = seed.map((r) => row(++seq, r));

  const newestFirst = (a: AdminCredentialRow, b: AdminCredentialRow) =>
    b.createdAt.getTime() - a.createdAt.getTime();

  return {
    async listByParent(parentId) {
      return rows.filter((r) => r.parentId === parentId).sort(newestFirst);
    },

    async findByCredentialId(credentialId) {
      return rows.find((r) => r.credentialId === credentialId) ?? null;
    },

    async create(data: NewAdminCredential) {
      if (rows.some((r) => r.credentialId === data.credentialId)) return null;
      const created = row(++seq, { ...data, transports: data.transports.join(",") });
      rows.push(created);
      return created;
    },

    async recordUse(credentialId, counter, usedAt) {
      const r = rows.find((x) => x.credentialId === credentialId);
      if (!r) return;
      r.counter = counter;
      r.lastUsedAt = usedAt;
    },

    async remove(id) {
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows.splice(i, 1);
    },
  };
}
