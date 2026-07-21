import { describe, it, expect } from "vitest";
import type { ProfileStore } from "@/db/stores/profile-store";
import type { ProfileSeed } from "@/db/stores/profile-store.fake";

/**
 * Shared ProfileStore conformance spec — run against BOTH the in-memory fake and
 * the pg adapter. Pins the CRUD contract and the case-insensitive list order.
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
      expect(row.epicTickets).toBe(0);
      expect(await store.find(row.id)).not.toBeNull();
    });

    it("update changes profile fields; null for an absent child", async () => {
      const store = await makeStore([{ name: "old", avatar: "cat" }]);
      const [row] = await store.list();
      const updated = await store.update(row.id, { name: "new", avatar: "fox" });
      expect(updated).toMatchObject({ name: "new", avatar: "fox" });
      expect(await store.update("ghost", { name: "x", avatar: "cat" })).toBeNull();
    });

    it("remove deletes the child", async () => {
      const store = await makeStore([{ name: "kid", avatar: "cat" }]);
      const [row] = await store.list();
      await store.remove(row.id);
      expect(await store.find(row.id)).toBeNull();
      expect(await store.list()).toHaveLength(0);
    });
  });
}
