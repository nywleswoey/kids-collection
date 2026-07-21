import { describe, it, expect } from "vitest";
import { makeProfileService } from "@/features/profiles/service";
import { inMemoryProfileStore, type ProfileSeed } from "@/db/stores/profile-store.fake";

/** Reachable only because the service accepts a ProfileStore port. Covers the
 * validation + row→domain mapping that used to sit against the db singleton. */
function setup(seed: ProfileSeed = []) {
  const store = inMemoryProfileStore(seed);
  return { service: makeProfileService({ profiles: store }), store };
}

describe("makeProfileService", () => {
  it("listChildren returns domain Child objects, name-ordered, with pickTickets", async () => {
    const { service } = setup([
      { name: "Zoe", avatar: "cat" },
      { name: "abe", avatar: "owl", rarePickTickets: 2 },
    ]);
    const kids = await service.listChildren();
    expect(kids.map((c) => c.name)).toEqual(["abe", "Zoe"]);
    expect(kids[0].pickTickets).toEqual({ common: 0, rare: 2, epic: 0, legendary: 0 });
  });

  it("getChild maps a found row and returns null for a miss", async () => {
    const { service, store } = setup([{ name: "kid", avatar: "fox" }]);
    const [row] = await store.list();
    expect((await service.getChild(row.id))?.name).toBe("kid");
    expect(await service.getChild("nope")).toBeNull();
  });

  it("createChild validates input and returns a Child with default tokens", async () => {
    const { service } = setup();
    const child = await service.createChild({ name: "  Newbie  ", avatar: "owl" });
    expect(child).toMatchObject({ name: "Newbie", avatar: "owl", pullTokens: 3 });
  });

  it("createChild rejects an empty name or unknown avatar", async () => {
    const { service } = setup();
    await expect(service.createChild({ name: "", avatar: "owl" })).rejects.toThrow();
    await expect(service.createChild({ name: "ok", avatar: "not-an-avatar" })).rejects.toThrow();
  });

  it("updateChild throws when the child does not exist", async () => {
    const { service } = setup();
    await expect(service.updateChild("ghost", { name: "x", avatar: "cat" })).rejects.toThrow("not found");
  });

  it("removeChild deletes the profile", async () => {
    const { service, store } = setup([{ name: "kid", avatar: "cat" }]);
    const [row] = await store.list();
    await service.removeChild(row.id);
    expect(await service.getChild(row.id)).toBeNull();
  });
});
