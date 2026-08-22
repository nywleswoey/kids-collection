import { describe, it, expect, beforeEach } from "vitest";
import { findChildRow } from "@/db/child-reads";
import { pgProfileStore } from "@/db/stores/profile-store.pg";
import { resetAll, seedChildren } from "./db";

/**
 * `findChildRow` is the by-id read behind the `activeChildId` cookie — the one
 * path by which a child who is already playing keeps playing. Since #97 it
 * carries an `archived_at IS NULL` predicate, and that predicate is what
 * `CONTEXT.md` and `docs/RESTORE.md` both point at when they say archiving signs
 * a child out.
 *
 * It needs its own file because it is not a port: it reaches the `db` singleton
 * directly, so no adapter contract runs it and no fake stands in for it. Before
 * this test the claim was documented in three places and pinned in none.
 */
describe("findChildRow: the active-profile cookie's re-validation (#97)", () => {
  beforeEach(async () => {
    await resetAll();
    await seedChildren({ kid1: {}, kid2: {} });
  });

  it("resolves an active child", async () => {
    expect((await findChildRow("kid1"))?.id).toBe("kid1");
  });

  it("reads an archived child as absent, so a still-set cookie stops resolving", async () => {
    await pgProfileStore.archive("kid1");

    expect(await findChildRow("kid1")).toBeUndefined();
    expect((await findChildRow("kid2"))?.id).toBe("kid2"); // and nobody else's
  });

  it("resolves again after a restore", async () => {
    await pgProfileStore.archive("kid1");
    await pgProfileStore.restore("kid1");

    expect((await findChildRow("kid1"))?.id).toBe("kid1");
  });
});
