import { describe, it, expect, beforeEach } from "vitest";
import { pgProfileStore } from "@/db/stores/profile-store.pg";
import { resetAll, seedChildren } from "./db";

/**
 * `pgProfileStore.find` is the by-id read behind the `activeChildId` cookie
 * (`src/features/profiles/active-profile.ts`) — the one path by which a child
 * who is already playing keeps playing. Since #97 it carries an
 * `archived_at IS NULL` predicate, and that predicate is what `CONTEXT.md` and
 * `docs/RESTORE.md` both point at when they say archiving signs a child out.
 * Pinned against real Postgres here, by that caller's name, so the claim is a
 * test and not just documentation.
 */
describe("pgProfileStore.find: the active-profile cookie's re-validation (#97)", () => {
  beforeEach(async () => {
    await resetAll();
    await seedChildren({ kid1: {}, kid2: {} });
  });

  it("resolves an active child", async () => {
    expect((await pgProfileStore.find("kid1"))?.id).toBe("kid1");
  });

  it("reads an archived child as absent, so a still-set cookie stops resolving", async () => {
    await pgProfileStore.archive("kid1");

    expect(await pgProfileStore.find("kid1")).toBeNull();
    expect((await pgProfileStore.find("kid2"))?.id).toBe("kid2"); // and nobody else's
  });

  it("resolves again after a restore", async () => {
    await pgProfileStore.archive("kid1");
    await pgProfileStore.restore("kid1");

    expect((await pgProfileStore.find("kid1"))?.id).toBe("kid1");
  });
});
