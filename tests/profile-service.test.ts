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
  it("listChildren returns domain Child objects, name-ordered, with easterEggTickets", async () => {
    const { service } = setup([
      { name: "Zoe", avatar: "cat" },
      { name: "abe", avatar: "owl", easterEggTickets: 2 },
    ]);
    const kids = await service.listChildren();
    expect(kids.map((c) => c.name)).toEqual(["abe", "Zoe"]);
    expect(kids[0].easterEggTickets).toBe(2);
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

  it("archiveChild hides the profile from every child-facing read", async () => {
    const { service, store } = setup([{ name: "kid", avatar: "cat" }]);
    const [row] = await store.list();
    await service.archiveChild(row.id);
    expect(await service.getChild(row.id)).toBeNull();
    expect(await service.listChildren()).toEqual([]);
  });

  it("archiveChild is reversible — restoreChild brings the profile back intact", async () => {
    const { service, store } = setup([
      { name: "kid", avatar: "cat", pullTokens: 9, easterEggTickets: 4 },
    ]);
    const [row] = await store.list();

    await service.archiveChild(row.id);
    await service.restoreChild(row.id);

    expect(await service.getChild(row.id)).toMatchObject({
      name: "kid",
      avatar: "cat",
      pullTokens: 9,
      easterEggTickets: 4,
    });
  });

  it("listArchivedProfiles is the only read that sees archived children", async () => {
    const { service, store } = setup([
      { name: "Zoe", avatar: "cat" },
      { name: "abe", avatar: "owl" },
    ]);
    const [abe] = await store.list();
    await service.archiveChild(abe.id);

    expect((await service.listChildren()).map((c) => c.name)).toEqual(["Zoe"]);

    const archived = await service.listArchivedProfiles();
    expect(archived.map((c) => c.name)).toEqual(["abe"]);
    expect(archived[0].archivedAt).toBeInstanceOf(Date);
  });
});
