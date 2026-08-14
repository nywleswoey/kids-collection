import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { slug, blobKey, promptHash, reviewKey } from "@/features/pool/keys";
import { buildPrompt, ART_STYLE } from "@/features/pool/prompt";

const card = { name: "SR-71 Blackbird", imagePrompt: "a sleek black jet" };

describe("slug / blobKey (Inc24 FR7 — unchanged behaviour)", () => {
  it("lowercases and collapses non-alphanumerics", () => {
    expect(slug("Flying Machines-SR-71 Blackbird")).toBe(
      "flying-machines-sr-71-blackbird",
    );
  });

  it("trims leading and trailing dashes", () => {
    expect(slug("  !Hello!  ")).toBe("hello");
  });

  it("blobKey keeps the pre-Inc24 shape — the hash has no job in Blob (Q6=A)", () => {
    expect(blobKey("Ocean Machines", "Alvin")).toBe("ocean-machines-alvin");
    expect(blobKey("Ocean Machines", "Alvin")).not.toContain(
      promptHash({ imagePrompt: "x" }),
    );
  });
});

describe("promptHash (D4 — hashes the FULL prompt, not the raw imagePrompt)", () => {
  it("is sha256 over buildPrompt(card), truncated to 8 hex chars", () => {
    const expected = createHash("sha256")
      .update(buildPrompt(card))
      .digest("hex")
      .slice(0, 8);
    expect(promptHash(card)).toBe(expected);
    expect(promptHash(card)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is NOT sha256 over the bare imagePrompt", () => {
    // The distinction is the point of D4: ART_STYLE is part of what renders, so a
    // change to it must invalidate every review file. Hashing the bare prompt
    // would leave that change invisible to the review gate.
    const bare = createHash("sha256")
      .update(card.imagePrompt)
      .digest("hex")
      .slice(0, 8);
    expect(promptHash(card)).not.toBe(bare);
    expect(buildPrompt(card)).toContain(ART_STYLE);
  });

  it("changes when the imagePrompt changes", () => {
    expect(promptHash({ imagePrompt: "a red plane" })).not.toBe(
      promptHash({ imagePrompt: "a blue plane" }),
    );
  });

  it("is deterministic", () => {
    expect(promptHash(card)).toBe(promptHash({ ...card }));
  });
});

describe("reviewKey (FR7 content-addressed, #67 provider-segmented)", () => {
  const SEG = "pollinations-7f3a";

  it("is the blob slug, the prompt hash, then the provider segment", () => {
    expect(reviewKey("Flying Machines", card, SEG)).toBe(
      `${blobKey("Flying Machines", card.name)}-${promptHash(card)}-${SEG}`,
    );
  });

  it("changes when the imagePrompt changes — so an edited prompt can never reuse a stale review", () => {
    const before = reviewKey("Flying Machines", card, SEG);
    const after = reviewKey("Flying Machines", {
      ...card,
      imagePrompt: "a sleek black jet on a runway",
    }, SEG);
    expect(after).not.toBe(before);
  });

  it("changes when the card or theme name changes", () => {
    expect(reviewKey("Flying Machines", card, SEG)).not.toBe(
      reviewKey("Ocean Machines", card, SEG),
    );
    expect(reviewKey("Flying Machines", card, SEG)).not.toBe(
      reviewKey("Flying Machines", { ...card, name: "Concorde" }, SEG),
    );
  });

  // The #67 mechanism: switching provider must make --sync miss the file, which
  // is what makes FR9 refuse rather than republish art nobody reviewed.
  it("changes when the provider segment changes", () => {
    expect(reviewKey("Flying Machines", card, "pollinations-7f3a")).not.toBe(
      reviewKey("Flying Machines", card, "cloudflare-sdxl-9b21"),
    );
  });

  // ...but the hash itself must NOT, or the contact sheet has no key to group a
  // subject's candidates into one row (#63's subject x provider grid).
  it("keeps ONE promptHash across providers, so bake-off candidates share a row", () => {
    const a = reviewKey("Flying Machines", card, "pollinations-7f3a");
    const b = reviewKey("Flying Machines", card, "cloudflare-sdxl-9b21");
    expect(a).toContain(promptHash(card));
    expect(b).toContain(promptHash(card));
  });
});
