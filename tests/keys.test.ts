import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  slug,
  blobKey,
  coverBlobKey,
  promptHash,
  reviewKey,
} from "@/features/pool/keys";
import {
  buildPrompt,
  buildCoverPrompt,
  cardSubject,
  coverSubject,
  ART_STYLE,
  COVER_STYLE,
  COVER_SUBJECT_NAME,
} from "@/features/pool/prompt";

const card = { name: "SR-71 Blackbird", imagePrompt: "a sleek black jet" };
const subject = cardSubject(card);

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
      promptHash(buildPrompt({ imagePrompt: "x" })),
    );
  });
});

describe("promptHash (D4 — hashes the FULL prompt, not the raw imagePrompt)", () => {
  it("is sha256 over buildPrompt(card), truncated to 8 hex chars", () => {
    const expected = createHash("sha256")
      .update(buildPrompt(card))
      .digest("hex")
      .slice(0, 8);
    expect(promptHash(subject.prompt)).toBe(expected);
    expect(promptHash(subject.prompt)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is NOT sha256 over the bare imagePrompt", () => {
    // The distinction is the point of D4: ART_STYLE is part of what renders, so a
    // change to it must invalidate every review file. Hashing the bare prompt
    // would leave that change invisible to the review gate.
    const bare = createHash("sha256")
      .update(card.imagePrompt)
      .digest("hex")
      .slice(0, 8);
    expect(promptHash(subject.prompt)).not.toBe(bare);
    expect(buildPrompt(card)).toContain(ART_STYLE);
  });

  it("changes when the imagePrompt changes", () => {
    expect(promptHash(buildPrompt({ imagePrompt: "a red plane" }))).not.toBe(
      promptHash(buildPrompt({ imagePrompt: "a blue plane" })),
    );
  });

  it("is deterministic", () => {
    expect(promptHash(subject.prompt)).toBe(promptHash(cardSubject({ ...card }).prompt));
  });
});

describe("reviewKey (FR7 content-addressed, #67 provider-segmented)", () => {
  const SEG = "pollinations-7f3a";

  it("is the blob slug, the prompt hash, then the provider segment", () => {
    expect(reviewKey("Flying Machines", subject, SEG)).toBe(
      `${blobKey("Flying Machines", card.name)}-${promptHash(subject.prompt)}-${SEG}`,
    );
  });

  it("changes when the imagePrompt changes — so an edited prompt can never reuse a stale review", () => {
    const before = reviewKey("Flying Machines", subject, SEG);
    const after = reviewKey(
      "Flying Machines",
      cardSubject({ ...card, imagePrompt: "a sleek black jet on a runway" }),
      SEG,
    );
    expect(after).not.toBe(before);
  });

  it("changes when the card or theme name changes", () => {
    expect(reviewKey("Flying Machines", subject, SEG)).not.toBe(
      reviewKey("Ocean Machines", subject, SEG),
    );
    expect(reviewKey("Flying Machines", subject, SEG)).not.toBe(
      reviewKey("Flying Machines", cardSubject({ ...card, name: "Concorde" }), SEG),
    );
  });

  // The #67 mechanism: switching provider must make --sync miss the file, which
  // is what makes FR9 refuse rather than republish art nobody reviewed.
  it("changes when the provider segment changes", () => {
    expect(reviewKey("Flying Machines", subject, "pollinations-7f3a")).not.toBe(
      reviewKey("Flying Machines", subject, "cloudflare-sdxl-9b21"),
    );
  });

  // ...but the hash itself must NOT, or the contact sheet has no key to group a
  // subject's candidates into one row (#63's subject x provider grid).
  it("keeps ONE promptHash across providers, so bake-off candidates share a row", () => {
    const a = reviewKey("Flying Machines", subject, "pollinations-7f3a");
    const b = reviewKey("Flying Machines", subject, "cloudflare-sdxl-9b21");
    expect(a).toContain(promptHash(subject.prompt));
    expect(b).toContain(promptHash(subject.prompt));
  });
});

describe("theme covers (#122)", () => {
  const theme = { name: "Dinosaurs", coverPrompt: "a wide prehistoric valley" };

  // The reason #122 could take `promptHash` from a card to a string at all: the
  // string hashed is unchanged, so no published card's review file moves and no
  // re-review is forced. Pinned by VALUE rather than by re-deriving it, because
  // a test that recomputes the thing it is checking would follow a regression.
  it("leaves a card's hash exactly where it was", () => {
    // Derived from origin/main's ART_STYLE, not from this branch's code.
    expect(promptHash(buildPrompt(card))).toBe("7dfdd51a");
  });

  it("a cover carries COVER_STYLE, never ART_STYLE", () => {
    expect(buildCoverPrompt(theme)).toContain(COVER_STYLE);
    expect(buildCoverPrompt(theme)).not.toContain(ART_STYLE);
  });

  it("a cover and a card with the SAME authored words hash differently", () => {
    // The whole point of a separate style: a place run through the card style is
    // a different picture, so it must be a different review file.
    const words = "a wide prehistoric valley";
    expect(promptHash(coverSubject({ coverPrompt: words }).prompt)).not.toBe(
      promptHash(cardSubject({ name: "x", imagePrompt: words }).prompt),
    );
  });

  it("names a cover under the theme, in its own blob namespace", () => {
    expect(coverSubject(theme).name).toBe(COVER_SUBJECT_NAME);
    expect(coverBlobKey("Ocean Machines")).toBe("ocean-machines");
  });

  // A card called "Cover" would slug to the same `cards/<theme>-cover` a naive
  // cover key would, and publish over it silently. Different namespaces make the
  // collision unrepresentable — this pins that they stay different.
  it("cannot collide with a card that happens to be named Cover", () => {
    expect(coverBlobKey("Ocean Machines")).not.toBe(
      blobKey("Ocean Machines", COVER_SUBJECT_NAME),
    );
  });
});
