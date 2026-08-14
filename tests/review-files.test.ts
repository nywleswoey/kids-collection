import { describe, it, expect, afterEach } from "vitest";
import {
  buildSidecar,
  missingReviews,
  reviewFileName,
  resolveProviderId,
  sidecarFileName,
  unknownProviders,
  type AuditTheme,
} from "@/features/pool/review-files";
import { promptHash } from "@/features/pool/keys";
import { cardKey } from "@/features/pool/publish-plan";
import { fakeProvider } from "@/features/pool/providers/fake";
import {
  PROVIDERS,
  PROVIDER_IDS,
  ProviderSelectionError,
  parseProvidersFlag,
  paramHash,
  providerById,
  selectLanes,
} from "@/features/pool/providers";

const card = { name: "Longbowman", imagePrompt: "an English longbowman" };

describe("reviewFileName (#63, #67)", () => {
  it("is theme-card-promptHash-provider-paramHash, with the provider's own extension", () => {
    const p = fakeProvider({ id: "cloudflare-sdxl", params: { steps: 20 } });
    expect(reviewFileName("Warriors", card, p)).toBe(
      `warriors-longbowman-${promptHash(card)}-cloudflare-sdxl-${paramHash({ steps: 20 })}.png`,
    );
  });

  it("follows the provider's format for the extension — they do not agree", () => {
    // Pollinations serves JPEG, Cloudflare PNG. A fixed .jpg would be a lie on
    // disk and would make the contact sheet depend on a browser ignoring it.
    const png = fakeProvider({ id: "a" });
    const jpg = { ...fakeProvider({ id: "b" }), format: "jpeg" as const };
    expect(reviewFileName("Warriors", card, png).endsWith(".png")).toBe(true);
    expect(reviewFileName("Warriors", card, jpg).endsWith(".jpg")).toBe(true);
  });

  it("changes when a provider's params drift — D4's hole, closed one level down", () => {
    // Bumping SDXL's steps changes what the card renders as just as completely
    // as editing ART_STYLE does, and appears in no prompt. Without this, every
    // review file would still match.
    const before = reviewFileName("Warriors", card, fakeProvider({ id: "cf", params: { steps: 20 } }));
    const after = reviewFileName("Warriors", card, fakeProvider({ id: "cf", params: { steps: 30 } }));
    expect(after).not.toBe(before);
  });

  it("does NOT change when params are merely reordered", () => {
    const a = reviewFileName("Warriors", card, fakeProvider({ id: "cf", params: { steps: 20, seed: 42 } }));
    const b = reviewFileName("Warriors", card, fakeProvider({ id: "cf", params: { seed: 42, steps: 20 } }));
    expect(a).toBe(b);
  });

  it("keeps one promptHash across providers, so a bake-off row is groupable", () => {
    // #63 turned review into a subject x provider grid; a grid needs a key that
    // groups a row. Folding the provider into promptHash would destroy it.
    const a = reviewFileName("Warriors", card, fakeProvider({ id: "alpha" }));
    const b = reviewFileName("Warriors", card, fakeProvider({ id: "beta" }));
    expect(a).toContain(promptHash(card));
    expect(b).toContain(promptHash(card));
    expect(a).not.toBe(b);
  });

  it("puts the sidecar on the same stem, as .json", () => {
    const p = fakeProvider({ id: "alpha" });
    expect(sidecarFileName("Warriors", card, p)).toBe(
      reviewFileName("Warriors", card, p).replace(/\.png$/, ".json"),
    );
  });
});

describe("resolveProviderId (#63 — theme default plus sparse overrides)", () => {
  it("prefers the card's override over the theme default", () => {
    expect(resolveProviderId({ provider: "pollinations" }, { provider: "cloudflare-sdxl" })).toBe(
      "cloudflare-sdxl",
    );
  });

  it("falls back to the theme default", () => {
    expect(resolveProviderId({ provider: "pollinations" }, {})).toBe("pollinations");
  });

  it("is undefined when neither is set — a bake-off nobody has judged", () => {
    // Not an error: it resolves to no filename, so FR9 finds no reviewed image
    // and refuses. A theme whose bake-off was never judged publishes nothing, by
    // construction rather than by a new check.
    expect(resolveProviderId({}, {})).toBeUndefined();
  });
});

describe("the FR9 audit (#67 — what --sync refuses, and why)", () => {
  const alpha = fakeProvider({ id: "alpha" });
  const lookup = (id: string) => (id === "alpha" ? alpha : undefined);

  const theme = (over: Partial<AuditTheme> = {}): AuditTheme => ({
    name: "Warriors",
    cards: [card, { name: "Halberdier", imagePrompt: "a halberdier" }],
    ...over,
  });
  const allPlanned = new Set([cardKey("Warriors", "Longbowman"), cardKey("Warriors", "Halberdier")]);
  const nothingOnDisk = () => false;
  const everythingOnDisk = () => true;

  it("refuses a card whose bake-off was never judged", () => {
    // The fail-safe #63 relied on: an unresolved provider matches no file, so a
    // theme where no pick was made publishes nothing — by construction, not by a
    // new check.
    const found = missingReviews([theme()], allPlanned, lookup, everythingOnDisk);
    expect(found).toHaveLength(2);
    expect(found[0].reason).toContain("no provider chosen");
  });

  it("accepts a card whose resolved provider has a file on disk", () => {
    expect(
      missingReviews([theme({ provider: "alpha" })], allPlanned, lookup, everythingOnDisk),
    ).toEqual([]);
  });

  it("refuses when the resolved provider's file is absent, naming the provider", () => {
    const found = missingReviews([theme({ provider: "alpha" })], allPlanned, lookup, nothingOnDisk);
    expect(found).toHaveLength(2);
    expect(found[0].reason).toBe("no reviewed image from alpha");
  });

  it("refuses after a provider switch — the mechanism, not 'nobody will do that'", () => {
    // Reviewed under alpha, then the theme is repointed at beta. The resolved
    // filename changes, so nothing on disk matches and the insert is refused.
    const onDisk = new Set([reviewFileName("Warriors", card, alpha)]);
    const beta = fakeProvider({ id: "beta" });
    const twoProviders = (id: string) => ({ alpha, beta })[id as "alpha" | "beta"];
    const planned = new Set([cardKey("Warriors", "Longbowman")]);
    const oneCard = { name: "Warriors", cards: [card] };

    expect(
      missingReviews([{ ...oneCard, provider: "alpha" }], planned, twoProviders, (f) => onDisk.has(f)),
    ).toEqual([]);
    expect(
      missingReviews([{ ...oneCard, provider: "beta" }], planned, twoProviders, (f) => onDisk.has(f)),
    ).toHaveLength(1);
  });

  it("refuses after a provider's params drift, with the file untouched", () => {
    // The same guarantee for the hole D4 left one level down: the reviewed bytes
    // came from 20 steps, the adapter now asks for 30.
    const before = fakeProvider({ id: "alpha", params: { steps: 20 } });
    const after = fakeProvider({ id: "alpha", params: { steps: 30 } });
    const onDisk = new Set([reviewFileName("Warriors", card, before)]);
    const planned = new Set([cardKey("Warriors", "Longbowman")]);
    const oneCard = { name: "Warriors", provider: "alpha", cards: [card] };

    expect(missingReviews([oneCard], planned, () => before, (f) => onDisk.has(f))).toEqual([]);
    expect(missingReviews([oneCard], planned, () => after, (f) => onDisk.has(f))).toHaveLength(1);
  });

  it("ignores cards that are not planned inserts — no back-fill of seed/review/", () => {
    // The ~360 already-published cards are not in the plan, so they never need a
    // review file. Insert-scoped, as FR9 has always been.
    expect(missingReviews([theme()], new Set(), lookup, nothingOnDisk)).toEqual([]);
  });

  it("honours a per-card override over the theme default", () => {
    const found = missingReviews(
      [{ name: "Warriors", provider: "alpha", cards: [{ ...card, provider: "ghost" }] }],
      new Set([cardKey("Warriors", "Longbowman")]),
      lookup,
      everythingOnDisk,
    );
    expect(found[0].reason).toContain('unknown provider "ghost"');
  });

  it("reports an unregistered provider separately from a missing image", () => {
    // Different mistakes, different fixes: a typo is not solved by re-running
    // --review, and saying "no reviewed image" would send the author to do just
    // that.
    const themes = [{ name: "Warriors", provider: "ghost", cards: [card] }];
    const planned = new Set([cardKey("Warriors", "Longbowman")]);
    expect(unknownProviders(themes, planned, lookup)).toEqual([
      { theme: "Warriors", card: "Longbowman", providerId: "ghost" },
    ]);
    expect(unknownProviders([theme({ provider: "alpha" })], allPlanned, lookup)).toEqual([]);
    expect(unknownProviders([theme()], allPlanned, lookup)).toEqual([]); // unset is not unknown
  });
});

describe("buildSidecar", () => {
  it("records what was asked for and what answered, side by side (#64)", () => {
    const provider = fakeProvider({ id: "pollinations", params: { model: "flux", seed: 42 } });
    expect(
      buildSidecar(provider, { bytes: new Uint8Array(), format: "jpeg", model: "sana" }),
    ).toEqual({
      provider: "pollinations",
      model: "sana",
      params: { model: "flux", seed: 42 },
      format: "jpeg",
    });
  });

  it("leaves model undefined when the provider witnessed nothing", () => {
    const provider = fakeProvider({ id: "cloudflare-sdxl" });
    expect(
      buildSidecar(provider, { bytes: new Uint8Array(), format: "png" }).model,
    ).toBeUndefined();
  });
});

describe("the registry (#67)", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  function configureAll() {
    process.env.POLLINATIONS_TOKEN = "t";
    process.env.CLOUDFLARE_ACCOUNT_ID = "a";
    process.env.CLOUDFLARE_API_TOKEN = "t";
  }

  it("registers every lane in code, with unique ids", () => {
    expect(PROVIDER_IDS.length).toBe(new Set(PROVIDER_IDS).size);
    expect(PROVIDERS.length).toBeGreaterThanOrEqual(2);
    for (const id of PROVIDER_IDS) expect(providerById(id)!.id).toBe(id);
  });

  it("does not register AI Horde while #71 is open", () => {
    // #62 shortlisted it, but its acceptability for a kids' app is an open
    // decision. Registering it here would ship a call that ticket has not made.
    expect(PROVIDER_IDS).not.toContain("ai-horde");
  });

  it("selects every lane when --providers is absent", () => {
    configureAll();
    expect(selectLanes().map((p) => p.id)).toEqual([...PROVIDER_IDS]);
  });

  it("narrows deliberately when --providers names a subset", () => {
    configureAll();
    expect(selectLanes(["pollinations"]).map((p) => p.id)).toEqual(["pollinations"]);
  });

  it("ABORTS on an unconfigured lane rather than dropping it", () => {
    // The failure this prevents: a forgotten export silently narrows the
    // bake-off, and the missing provider then reads as one that drew badly.
    configureAll();
    delete process.env.CLOUDFLARE_API_TOKEN;
    expect(() => selectLanes()).toThrow(ProviderSelectionError);
    try {
      selectLanes();
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain("CLOUDFLARE_API_TOKEN"); // names what to set
      expect(message).toContain("--providers=pollinations"); // and the way past it
    }
  });

  it("rejects an unknown id in --providers", () => {
    configureAll();
    expect(() => selectLanes(["pollinatoins"])).toThrow(/unknown provider/);
  });

  it("parses the --providers flag, and is undefined when absent", () => {
    expect(parseProvidersFlag(["--review"])).toBeUndefined();
    expect(parseProvidersFlag(["--providers=a,b"])).toEqual(["a", "b"]);
    expect(parseProvidersFlag(["--providers= a , b "])).toEqual(["a", "b"]);
  });

  it("does not require credentials merely to look a provider up", () => {
    // --sync needs the adapter registered to rebuild a review filename, but it
    // never generates, so publishing reviewed bytes must not demand keys.
    delete process.env.POLLINATIONS_TOKEN;
    expect(providerById("pollinations")).toBeDefined();
  });
});
