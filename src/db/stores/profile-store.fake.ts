import type { ChildRow } from "@/db/schema";
import type { ArchivedChildRow, ProfileStore } from "./profile-store";

/** Seed rows may set any columns; unset balance columns default per schema
 *  (pullTokens 3, tickets 0). id defaults to a generated one; a seed row is
 *  active unless it sets `archivedAt`. */
export type ProfileSeed = Array<Partial<ChildRow> & { name: string; avatar: string }>;

function row(seq: number, r: Partial<ChildRow> & { name: string; avatar: string }): ChildRow {
  return {
    id: r.id ?? `c${seq}`,
    name: r.name,
    avatar: r.avatar,
    pullTokens: r.pullTokens ?? 3, // schema default (BR4)
    easterEggTickets: r.easterEggTickets ?? 0,
    archivedAt: r.archivedAt ?? null, // NULL = active (#97)
  };
}

/**
 * In-memory ProfileStore. `list` returns ACTIVE rows ordered case-insensitively
 * by name (matching the pg `lower(name)` order); `create` stamps a fresh id and
 * the schema-default balances; `archive`/`restore` flip `archivedAt` without ever
 * dropping a row, which is the fake's whole point — it has no cascades, so the
 * only thing it can get wrong is visibility. Kept honest by the shared contract
 * suite.
 */
export function inMemoryProfileStore(seed: ProfileSeed = []): ProfileStore {
  let seq = 0;
  const rows: ChildRow[] = seed.map((r) => row(++seq, r));

  const byName = (a: ChildRow, b: ChildRow) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase());

  /** Only ever resolves ACTIVE rows — the same predicate the pg adapter carries
   *  on `find` and `update`. */
  const active = (id: string) => rows.find((r) => r.id === id && r.archivedAt === null);

  return {
    async list() {
      return rows.filter((r) => r.archivedAt === null).sort(byName);
    },

    async listArchived() {
      return rows.filter((r): r is ArchivedChildRow => r.archivedAt !== null).sort(byName);
    },

    async find(id) {
      return active(id) ?? null;
    },

    async create(data) {
      const created = row(++seq, data);
      rows.push(created);
      return created;
    },

    async update(id, data) {
      const r = active(id);
      if (!r) return null;
      r.name = data.name;
      r.avatar = data.avatar;
      return r;
    },

    async archive(id) {
      const r = active(id); // already-archived → no-op, so the stamp never moves
      if (r) r.archivedAt = new Date();
    },

    async restore(id) {
      const r = rows.find((x) => x.id === id);
      if (r) r.archivedAt = null;
    },
  };
}
