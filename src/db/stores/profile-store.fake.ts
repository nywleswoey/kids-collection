import type { ChildRow } from "@/db/schema";
import type { ProfileStore } from "./profile-store";

/** Seed rows may set any columns; unset balance columns default per schema
 *  (pullTokens 3, tickets 0). id defaults to a generated one. */
export type ProfileSeed = Array<Partial<ChildRow> & { name: string; avatar: string }>;

function row(seq: number, r: Partial<ChildRow> & { name: string; avatar: string }): ChildRow {
  return {
    id: r.id ?? `c${seq}`,
    name: r.name,
    avatar: r.avatar,
    pullTokens: r.pullTokens ?? 3, // schema default (BR4)
    easterEggTickets: r.easterEggTickets ?? 0,
  };
}

/**
 * In-memory ProfileStore. `list` returns rows ordered case-insensitively by name
 * (matching the pg `lower(name)` order); `create` stamps a fresh id and the
 * schema-default balances. Kept honest by the shared contract suite.
 */
export function inMemoryProfileStore(seed: ProfileSeed = []): ProfileStore {
  let seq = 0;
  const rows: ChildRow[] = seed.map((r) => row(++seq, r));

  const byName = (a: ChildRow, b: ChildRow) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase());

  return {
    async list() {
      return [...rows].sort(byName);
    },

    async find(id) {
      return rows.find((r) => r.id === id) ?? null;
    },

    async create(data) {
      const created = row(++seq, data);
      rows.push(created);
      return created;
    },

    async update(id, data) {
      const r = rows.find((x) => x.id === id);
      if (!r) return null;
      r.name = data.name;
      r.avatar = data.avatar;
      return r;
    },

    async remove(id) {
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows.splice(i, 1);
    },
  };
}
