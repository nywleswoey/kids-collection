import { describe, it, expect, afterEach } from "vitest";
import {
  buildSidecar,
  missingReviews,
  reviewFileName,
  resolveProviderId,
  sidecarFileName,
  unknownProviders,
  missingCoverReviews,
  type AuditTheme,
} from "@/features/pool/review-files";
import { promptHash } from "@/features/pool/keys";
import { cardSubject, coverSubject } from "@/features/pool/prompt";
import { cardKey } from "@/features/pool/publish-plan";
import { fakeProvider } from "@/features/pool/providers/fake";
import {
  LANES,
  PROVIDERS,
  PROVIDER_IDS,
  ProviderSelectionError,
  parseProvidersFlag,
  paramHash,
  providerById,
  selectLanes,
} from "@/features/pool/providers";

const card = { name: "Longbowman", imagePrompt: "an English longbowman" };
const subject = cardSubject(card);
const COVER = "a quiet stone fortress courtyard";

describe("reviewFileName (#63, #67)", () => {
  it("is theme-card-promptHash-provider-paramHash, with the provider's own extension", () => {
    const p = fakeProvider({ id: "cloudflare-sdxl", params: { steps: 20 } });
    expect(reviewFileName("Warriors", subject, p)).toBe(
      `warriors-longbowman-${promptHash(subject.prompt)}-cloudflare-sdxl-${paramHash({ steps: 20 })}.png`,
    );
  });

  it("follows the provider's format for the extension — they do not agree", () => {
    // Pollinations serves JPEG, Cloudflare PNG. A fixed .jpg would be a lie on
    // disk and would make the contact sheet depend on a browser ignoring it.
    const png = fakeProvider({ id: "a" });
    const jpg = { ...fakeProvider({ id: "b" }), format: "jpeg" as const };
    expect(reviewFileName("Warriors", subject, png).endsWith(".png")).toBe(true);
    expect(reviewFileName("Warriors", subject, jpg).endsWith(".jpg")).toBe(true);
  });

  it("changes when a provider's params drift — D4's hole, closed one level down", () => {
    // Bumping SDXL's steps changes what the card renders as just as completely
    // as editing ART_STYLE does, and appears in no prompt. Without this, every
    // review file would still match.
    const before = reviewFileName("Warriors", subject, fakeProvider({ id: "cf", params: { steps: 20 } }));
    const after = reviewFileName("Warriors", subject, fakeProvider({ id: "cf", params: { steps: 30 } }));
    expect(after).not.toBe(before);
  });

  it("does NOT change when params are merely reordered", () => {
    const a = reviewFileName("Warriors", subject, fakeProvider({ id: "cf", params: { steps: 20, seed: 42 } }));
    const b = reviewFileName("Warriors", subject, fakeProvider({ id: "cf", params: { seed: 42, steps: 20 } }));
    expect(a).toBe(b);
  });

  it("keeps one promptHash across providers, so a bake-off row is groupable", () => {
    // #63 turned review into a subject x provider grid; a grid needs a key that
    // groups a row. Folding the provider into promptHash would destroy it.
    const a = reviewFileName("Warriors", subject, fakeProvider({ id: "alpha" }));
    const b = reviewFileName("Warriors", subject, fakeProvider({ id: "beta" }));
    expect(a).toContain(promptHash(subject.prompt));
    expect(b).toContain(promptHash(subject.prompt));
    expect(a).not.toBe(b);
  });

  it("puts the sidecar on the same stem, as .json", () => {
    const p = fakeProvider({ id: "alpha" });
    expect(sidecarFileName("Warriors", subject, p)).toBe(
      reviewFileName("Warriors", subject, p).replace(/\.png$/, ".json"),
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
    coverPrompt: COVER,
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
    const onDisk = new Set([reviewFileName("Warriors", subject, alpha)]);
    const beta = fakeProvider({ id: "beta" });
    const twoProviders = (id: string) => ({ alpha, beta })[id as "alpha" | "beta"];
    const planned = new Set([cardKey("Warriors", "Longbowman")]);
    const oneCard = {
      name: "Warriors",
      coverPrompt: COVER,
      cards: [card],
    };

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
    const onDisk = new Set([reviewFileName("Warriors", subject, before)]);
    const planned = new Set([cardKey("Warriors", "Longbowman")]);
    const oneCard = {
      name: "Warriors",
      provider: "alpha",
      coverPrompt: COVER,
      cards: [card],
    };

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
      [{ name: "Warriors", provider: "alpha", coverPrompt: COVER, cards: [{ ...card, provider: "ghost" }] }],
      new Set([cardKey("Warriors", "Longbowman")]),
      lookup,
      everythingOnDisk,
    );
    expect(found[0].reason).toContain('unknown provider "ghost"');
  });

  // ── The #122 hard stop: no cover, no publish ───────────────────────────────
  describe("cover reviews (#122)", () => {
    const allCovers = new Set(["Warriors"]);

    it("refuses a theme whose cover has no reviewed image, naming it as Cover", () => {
      const found = missingCoverReviews(
        [theme({ provider: "alpha" })],
        allCovers,
        lookup,
        nothingOnDisk,
      );
      expect(found).toEqual([
        { theme: "Warriors", card: "Cover", reason: "no reviewed image from alpha" },
      ]);
    });

    it("refuses a theme whose bake-off was never judged", () => {
      const found = missingCoverReviews([theme()], allCovers, lookup, everythingOnDisk);
      expect(found[0].reason).toContain("no provider chosen");
    });

    // The guarantee is that a theme cannot reach a child unrecognisable. A cover
    // already published is not re-demanded, exactly as an already-published card
    // is not — the audit is publish-scoped, not a back-fill of seed/review/.
    it("ignores a theme whose cover is already published", () => {
      expect(
        missingCoverReviews([theme({ provider: "alpha" })], new Set(), lookup, nothingOnDisk),
      ).toEqual([]);
    });

    it("accepts a theme whose cover candidate is on disk", () => {
      const alphaTheme = theme({ provider: "alpha" });
      const onDisk = new Set([
        reviewFileName("Warriors", coverSubject(alphaTheme), alpha),
      ]);
      expect(
        missingCoverReviews([alphaTheme], allCovers, lookup, (f) => onDisk.has(f)),
      ).toEqual([]);
    });

    // A cover is named by the SAME machinery a card is, which is the only
    // agreement FR9 needs between the two audits — and the reason a cover cannot
    // be satisfied by a card's file that happens to sit in the same folder.
    it("is not satisfied by a card's reviewed image", () => {
      const alphaTheme = theme({ provider: "alpha" });
      const onDisk = new Set([reviewFileName("Warriors", subject, alpha)]);
      expect(
        missingCoverReviews([alphaTheme], allCovers, lookup, (f) => onDisk.has(f)),
      ).toHaveLength(1);
    });

    // Editing the authored place-prompt moves the filename, same as D4 does for
    // a card: a cover reviewed against words that no longer exist is stale.
    it("refuses after the coverPrompt is edited", () => {
      const before = theme({ provider: "alpha" });
      const onDisk = new Set([reviewFileName("Warriors", coverSubject(before), alpha)]);
      const after = theme({ provider: "alpha", coverPrompt: "a different courtyard" });
      expect(
        missingCoverReviews([after], allCovers, lookup, (f) => onDisk.has(f)),
      ).toHaveLength(1);
    });
  });

  it("reports an unregistered provider separately from a missing image", () => {
    // Different mistakes, different fixes: a typo is not solved by re-running
    // --review, and saying "no reviewed image" would send the author to do just
    // that.
    const themes = [{ name: "Warriors", provider: "ghost", coverPrompt: COVER, cards: [card] }];
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

  it("every registered provider declares a role", () => {
    for (const p of PROVIDERS) expect(["lane", "escape-hatch"]).toContain(p.role);
  });

  it("the default fan-out is lanes only — escape hatches sit out (#71)", () => {
    configureAll();
    expect(selectLanes().every((p) => p.role === "lane")).toBe(true);
    expect(LANES.length).toBeLessThanOrEqual(PROVIDERS.length);
  });

  it("registers AI Horde as an escape hatch with a pinned model (#74)", () => {
    // #71 settled the hatch's role and its request parameters but left the model
    // to #74, because an unpinned model makes 768x768 a coin-flip against live
    // queue depth — measured at 456-529px during #74's run, where a 768 request
    // is refused outright — and would name review files after a request never
    // made. With the model pinned, the hatch can register.
    expect(PROVIDER_IDS).toContain("ai-horde");
    const horde = providerById("ai-horde")!;
    expect(horde.role).toBe("escape-hatch");
    expect(horde.params.model).toBeTruthy();
    // Never in the default fan-out — reachable only by name (#71).
    expect(LANES.map((p) => p.id)).not.toContain("ai-horde");
  });

  it("reaches the escape hatch when it is named, and only then (#71)", () => {
    configureAll();
    process.env.AIHORDE_API_KEY = "k";
    expect(selectLanes(["ai-horde"]).map((p) => p.id)).toEqual(["ai-horde"]);
  });

  it("selects every lane when --providers is absent — and no hatch", () => {
    // Compared against LANES rather than PROVIDER_IDS. The two were the same set
    // while the registry held only lanes; #74 registered the first escape hatch,
    // and the whole point of the role is that they now differ.
    configureAll();
    expect(selectLanes().map((p) => p.id)).toEqual(LANES.map((p) => p.id));
    expect(LANES.length).toBeLessThan(PROVIDER_IDS.length);
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

  it("leaves an escape hatch out of the default fan-out, but reachable by name (#71)", () => {
    // #71's shape exactly: AI Horde is keyed and wired, excluded from #63's
    // eager per-card generation, and invoked deliberately for cards the lanes
    // refused or drew badly. Injected registry — no hatch is registered yet,
    // because #74 has not picked its model.
    const lane = fakeProvider({ id: "lane-a" });
    const hatch = fakeProvider({ id: "hatch-a", role: "escape-hatch" });
    const registry = [lane, hatch];

    expect(selectLanes(undefined, registry).map((p) => p.id)).toEqual(["lane-a"]);
    expect(selectLanes(["hatch-a"], registry).map((p) => p.id)).toEqual(["hatch-a"]);
    expect(selectLanes(["lane-a", "hatch-a"], registry).map((p) => p.id)).toEqual([
      "lane-a",
      "hatch-a",
    ]);
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
