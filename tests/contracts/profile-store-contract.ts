import { describe, it, expect } from "vitest";
import type { ProfileStore } from "@/db/stores/profile-store";
import type { ProfileSeed } from "@/db/stores/profile-store.fake";

/**
 * Shared ProfileStore conformance spec — run against BOTH the in-memory fake and
 * the pg adapter. Pins the CRUD contract, the case-insensitive list order, and
 * (since #97) the archive/restore contract that replaced the hard delete.
 * `makeStore(seed)` must return a FRESH, isolated store each call.
 */
export function runProfileStoreContract(
  label: string,
  makeStore: (seed?: ProfileSeed) => ProfileStore | Promise<ProfileStore>,
) {
  describe(`ProfileStore contract: ${label}`, () => {
    it("list orders case-insensitively by name", async () => {
      const store = await makeStore([
        { name: "zara", avatar: "cat" },
        { name: "Bea", avatar: "owl" },
        { name: "alan", avatar: "fox" },
      ]);
      expect((await store.list()).map((r) => r.name)).toEqual(["alan", "Bea", "zara"]);
    });

    it("find returns a row by id, or null", async () => {
      const store = await makeStore([{ name: "kid", avatar: "cat" }]);
      const [row] = await store.list();
      expect((await store.find(row.id))?.name).toBe("kid");
      expect(await store.find("nope")).toBeNull();
    });

    it("create inserts with schema-default balances and returns the row", async () => {
      const store = await makeStore();
      const row = await store.create({ name: "Newbie", avatar: "owl" });
      expect(row).toMatchObject({ name: "Newbie", avatar: "owl", pullTokens: 3 });
      expect(row.easterEggTickets).toBe(0);
      expect(row.archivedAt).toBeNull(); // a new profile is active
      expect(await store.find(row.id)).not.toBeNull();
    });

    it("update changes profile fields; null for an absent child", async () => {
      const store = await makeStore([{ name: "old", avatar: "cat" }]);
      const [row] = await store.list();
      const updated = await store.update(row.id, { name: "new", avatar: "fox" });
      expect(updated).toMatchObject({ name: "new", avatar: "fox" });
      expect(await store.update("ghost", { name: "x", avatar: "cat" })).toBeNull();
    });

    // ── archive / restore (#97) ──────────────────────────────────────────────
    //
    // The row is never deleted, so every assertion below is about VISIBILITY.
    // `list` and `find` are the two reads every parent- and child-facing surface
    // goes through; `listArchived` is the one read that deliberately sees the
    // other half, and exists only so a parent can undo.

    it("archive hides the child from list and find without deleting the row", async () => {
      const store = await makeStore([
        { name: "Ada", avatar: "cat" },
        { name: "Bea", avatar: "owl" },
      ]);
      const [ada] = await store.list();

      await store.archive(ada.id);

      expect((await store.list()).map((r) => r.name)).toEqual(["Bea"]);
      expect(await store.find(ada.id)).toBeNull();

      // …but the row is still there, stamped, and reachable for the undo.
      const [archived] = await store.listArchived();
      expect(archived).toMatchObject({ id: ada.id, name: "Ada", avatar: "cat" });
      expect(archived.archivedAt).toBeInstanceOf(Date);
    });

    it("restore brings the child back into list and find, clearing the stamp", async () => {
      const store = await makeStore([{ name: "Ada", avatar: "cat" }]);
      const [ada] = await store.list();
      await store.archive(ada.id);

      await store.restore(ada.id);

      expect((await store.list()).map((r) => r.name)).toEqual(["Ada"]);
      expect((await store.find(ada.id))?.archivedAt).toBeNull();
      expect(await store.listArchived()).toHaveLength(0);
    });

    it("archive preserves the balances it hides", async () => {
      const store = await makeStore([
        { name: "Ada", avatar: "cat", pullTokens: 7, easterEggTickets: 2 },
      ]);
      const [ada] = await store.list();
      await store.archive(ada.id);
      await store.restore(ada.id);
      expect(await store.find(ada.id)).toMatchObject({ pullTokens: 7, easterEggTickets: 2 });
    });

    it("archiving twice does not move the stamp — when it was archived is the fact", async () => {
      const store = await makeStore([{ name: "Ada", avatar: "cat" }]);
      const [ada] = await store.list();
      await store.archive(ada.id);
      const first = (await store.listArchived())[0].archivedAt;

      await store.archive(ada.id);

      expect((await store.listArchived())[0].archivedAt).toEqual(first);
    });

    it("archive and restore are no-ops for an unknown id", async () => {
      const store = await makeStore([{ name: "Ada", avatar: "cat" }]);
      await store.archive("ghost");
      await store.restore("ghost");
      expect(await store.list()).toHaveLength(1);
      expect(await store.listArchived()).toHaveLength(0);
    });

    it("restoring an active child leaves it active", async () => {
      const store = await makeStore([{ name: "Ada", avatar: "cat" }]);
      const [ada] = await store.list();
      await store.restore(ada.id);
      expect((await store.find(ada.id))?.archivedAt).toBeNull();
    });

    it("an archived child is inert — update does not reach it", async () => {
      const store = await makeStore([{ name: "Ada", avatar: "cat" }]);
      const [ada] = await store.list();
      await store.archive(ada.id);

      expect(await store.update(ada.id, { name: "Renamed", avatar: "fox" })).toBeNull();
      expect((await store.listArchived())[0].name).toBe("Ada");
    });

    it("listArchived orders case-insensitively by name, like list", async () => {
      const store = await makeStore([
        { name: "zara", avatar: "cat" },
        { name: "Bea", avatar: "owl" },
        { name: "alan", avatar: "fox" },
      ]);
      for (const r of await store.list()) await store.archive(r.id);
      expect((await store.listArchived()).map((r) => r.name)).toEqual(["alan", "Bea", "zara"]);
      expect(await store.list()).toHaveLength(0);
    });
  });
}
