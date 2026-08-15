import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  PROVENANCE_README,
  emptyProvenance,
  parseProvenance,
  recordProvenance,
  serializeProvenance,
  toProvenance,
} from "@/features/pool/provenance";
import {
  buildSidecar,
  parseSidecar,
  reviewFileName,
  reviewStem,
  type ReviewSidecar,
} from "@/features/pool/review-files";
import { fakeProvider } from "@/features/pool/providers/fake";

const witnessed: ReviewSidecar = {
  provider: "pollinations",
  model: "sana",
  params: { model: "flux", seed: 42 },
  format: "jpeg",
};

const unwitnessed: ReviewSidecar = {
  provider: "cloudflare-sdxl",
  params: { model: "stable-diffusion-xl-base-1.0", steps: 20, seed: 42 },
  format: "png",
};

const REVIEW_KEY = "warriors-longbowman-1a2b3c4d-pollinations-9f0e";

describe("toProvenance (#75)", () => {
  it("keeps what the response NAMED, separate from what was asked for", () => {
    // #64's finding is the whole reason this record exists: a request for `flux`
    // was served by `sana`, silently. Collapsing the two into one "model" field
    // would erase exactly the fact worth keeping.
    const rec = toProvenance(witnessed, REVIEW_KEY, true);
    expect(rec.model).toBe("sana");
    expect(rec.params.model).toBe("flux");
  });

  it("records null — never the requested model — when the provider witnessed nothing", () => {
    // Cloudflare reports no serving model (#65). A field that is honest for one
    // provider and a guess for another is worse than no field, so the guess is
    // never made: `params.model` stays where it is, as a request.
    const rec = toProvenance(unwitnessed, REVIEW_KEY, true);
    expect(rec.model).toBeNull();
    expect(rec.params.model).toBe("stable-diffusion-xl-base-1.0");
  });

  it("pins the reviewKey, which carries the prompt and param hashes", () => {
    // The one thing `provider` in seed/cards.json cannot say: WHICH prompt (and
    // therefore which ART_STYLE) and WHICH parameter bag drew these bytes.
    expect(toProvenance(witnessed, REVIEW_KEY, true).reviewKey).toBe(REVIEW_KEY);
  });

  it("accepts a sidecar straight from the generator", () => {
    // The durable record IS the picked candidate's sidecar. If these two drifted
    // apart, provenance would describe something other than what was reviewed.
    const provider = fakeProvider({ id: "alpha", params: { steps: 20 } });
    const sidecar = buildSidecar(provider, {
      bytes: new Uint8Array([1]),
      format: "png",
      model: "alpha-1",
    });
    const rec = toProvenance(sidecar, REVIEW_KEY, true);
    expect(rec).toEqual({
      provider: "alpha",
      model: "alpha-1",
      params: { steps: 20 },
      format: "png",
      reviewKey: REVIEW_KEY,
      reviewed: true,
    });
  });

  it("records that nobody saw the bytes, where nobody did", () => {
    // The --allow-unreviewed path generates at publish time. Its reviewKey is a
    // correct content address for bytes that were never in a review folder and
    // never in front of a human, and the run's warning scrolls past — so the
    // record carries the fact instead. FR9 is still the guarantee; this is its
    // receipt.
    expect(toProvenance(witnessed, REVIEW_KEY, false).reviewed).toBe(false);
  });
});

describe("emptyProvenance (#75)", () => {
  it("starts with no cards — the already-published pool is unwitnessed, permanently", () => {
    // ~360 cards shipped before any sidecar existed and their review files are
    // long gone. Inventing entries for them would be fabrication; absence is the
    // honest record.
    expect(emptyProvenance().themes).toEqual({});
  });
});

describe("recordProvenance (#75)", () => {
  const base = emptyProvenance();
  const rec = toProvenance(witnessed, REVIEW_KEY, true);

  it("files a record under its theme and card", () => {
    const next = recordProvenance(base, [
      { theme: "Warriors", card: "Longbowman", provenance: rec },
    ]);
    expect(next.themes.Warriors.Longbowman).toEqual(rec);
  });

  it("does not mutate the file it was given", () => {
    recordProvenance(base, [{ theme: "Warriors", card: "Longbowman", provenance: rec }]);
    expect(base.themes).toEqual({});
  });

  it("leaves every other theme and card exactly as it found them", () => {
    const one = recordProvenance(base, [
      { theme: "Warriors", card: "Longbowman", provenance: rec },
      { theme: "Ocean Machines", card: "Alvin", provenance: rec },
    ]);
    const two = recordProvenance(one, [
      { theme: "Warriors", card: "Samurai", provenance: toProvenance(unwitnessed, "k", true) },
    ]);
    expect(two.themes.Warriors.Longbowman).toEqual(rec);
    expect(two.themes["Ocean Machines"].Alvin).toEqual(rec);
  });

  it("replaces an existing record for the same card", () => {
    // Reached by a `--publish --reset` rebuild, or a card pruned and re-added:
    // `blobKey` is stable and prompt-independent, so that second publish
    // overwrote the object a child's binder points at. The record follows the
    // bytes; the old one describes art nobody has any more.
    const one = recordProvenance(base, [
      { theme: "Warriors", card: "Longbowman", provenance: rec },
    ]);
    const redrawn = toProvenance(unwitnessed, "warriors-longbowman-1a2b3c4d-cloudflare-sdxl-77aa", true);
    const two = recordProvenance(one, [
      { theme: "Warriors", card: "Longbowman", provenance: redrawn },
    ]);
    expect(two.themes.Warriors.Longbowman).toEqual(redrawn);
  });
});

describe("serializeProvenance (#75)", () => {
  it("sorts themes and cards, so a concurrent publish run cannot churn the diff", () => {
    // The publish loop runs SEED_CONCURRENCY workers, so completion order is not
    // the seed file's order and is not even stable between runs. Insertion order
    // would make every re-publish a spurious diff.
    const file = recordProvenance(emptyProvenance(), [
      { theme: "Warriors", card: "Samurai", provenance: toProvenance(witnessed, "k1", true) },
      { theme: "Animals", card: "Axolotl", provenance: toProvenance(witnessed, "k2", true) },
      { theme: "Warriors", card: "Longbowman", provenance: toProvenance(witnessed, "k3", true) },
    ]);
    const themes = Object.keys(parseProvenance(JSON.parse(serializeProvenance(file))).themes);
    expect(themes).toEqual(["Animals", "Warriors"]);
    const cards = Object.keys(JSON.parse(serializeProvenance(file)).themes.Warriors);
    expect(cards).toEqual(["Longbowman", "Samurai"]);
  });

  it("round-trips through parseProvenance", () => {
    const file = recordProvenance(emptyProvenance(), [
      { theme: "Warriors", card: "Longbowman", provenance: toProvenance(unwitnessed, REVIEW_KEY, true) },
    ]);
    expect(parseProvenance(JSON.parse(serializeProvenance(file)))).toEqual(file);
  });

  it("re-states the readme and ends with a newline", () => {
    // A JSON file cannot carry a comment, and this one is missing ~360 cards for
    // a reason a reader deserves at the point of contact.
    const out = serializeProvenance(emptyProvenance());
    expect(JSON.parse(out).readme).toBe(PROVENANCE_README);
    expect(out.endsWith("\n")).toBe(true);
  });
});

describe("the record and the candidate it describes (#75)", () => {
  const card = { name: "Longbowman", imagePrompt: "an English longbowman" };
  const provider = fakeProvider({ id: "cloudflare-sdxl", params: { steps: 20, seed: 42 } });

  it("embeds exactly the review filename's stem", () => {
    // The reviewKey is the record's only pin to WHICH prompt (and therefore which
    // ART_STYLE) and WHICH parameter bag drew the bytes. If it ever named
    // something other than the file that was reviewed, the record would point at
    // a candidate that never existed.
    const stem = reviewStem("Warriors", card, provider);
    const sidecar = buildSidecar(provider, { bytes: new Uint8Array([1]), format: "png" });
    const rec = toProvenance(sidecar, stem, true);
    expect(`${rec.reviewKey}.png`).toBe(reviewFileName("Warriors", card, provider));
  });

  it("survives the trip the sidecar actually makes: buildSidecar -> JSON -> parseSidecar", () => {
    // `--review` writes `JSON.stringify(buildSidecar(...))` to disk and both the
    // contact sheet and `--sync` read it back through `parseSidecar`. A writer
    // and a reader that disagreed would silently drop every record.
    for (const model of ["sana", undefined]) {
      const sidecar = buildSidecar(provider, { bytes: new Uint8Array([1]), format: "png", model });
      expect(parseSidecar(JSON.stringify(sidecar))?.model).toBe(model);
    }
  });

  it("reads nothing out of a file that is not a sidecar", () => {
    // Junk in gitignored scratch must not fail a publish, and must not put a
    // garbage label in a contact-sheet cell either.
    expect(parseSidecar("not json at all")).toBeUndefined();
    expect(parseSidecar('{"provider":"a"}')).toBeUndefined();
  });

  it("turns an omitted model on disk into an explicit null in the record", () => {
    // The one translation between the two: absent-because-unwitnessed is fine in
    // scratch beside a contact sheet that renders "model not reported"; in a
    // committed file it has to say so.
    const onDisk = JSON.parse(
      JSON.stringify(buildSidecar(provider, { bytes: new Uint8Array([1]), format: "png" })),
    );
    expect("model" in onDisk).toBe(false);
    expect(toProvenance(parseSidecar(JSON.stringify(onDisk))!, "k", true).model).toBeNull();
  });
});

describe("the committed seed/provenance.json (#75)", () => {
  const raw = readFileSync(join(process.cwd(), "seed", "provenance.json"), "utf8");

  it("is a valid provenance file", () => {
    // `--sync` LOADS this before it publishes anything and aborts if it does not
    // parse, so a broken one blocks a theme run. Here, CI catches it instead.
    expect(() => parseProvenance(JSON.parse(raw))).not.toThrow();
  });

  it("is byte-identical to what a no-op run would write", () => {
    // Guards the readme, which lives in two places by necessity — the constant
    // and the committed file. Without this, editing the constant leaves the file
    // stale until the next publish, silently.
    expect(serializeProvenance(parseProvenance(JSON.parse(raw)))).toBe(raw);
  });
});

describe("parseProvenance (#75)", () => {
  it("refuses a record whose model key is merely absent", () => {
    // "Unwitnessed" must be written down, not inferred from a missing key — an
    // absent key is indistinguishable from a writer that forgot.
    expect(() =>
      parseProvenance({
        themes: {
          Warriors: {
            Longbowman: {
              provider: "cloudflare-sdxl",
              params: {},
              format: "png",
              reviewKey: "k",
              reviewed: true,
            },
          },
        },
      }),
    ).toThrow();
  });

  it("refuses a file that is not a provenance file at all", () => {
    // Silently treating an unreadable file as empty would clobber every record
    // in it on the next publish.
    expect(() => parseProvenance({ themes: [] })).toThrow();
    expect(() => parseProvenance(null)).toThrow();
  });

  it("accepts a null model", () => {
    const file = recordProvenance(emptyProvenance(), [
      { theme: "Warriors", card: "Longbowman", provenance: toProvenance(unwitnessed, REVIEW_KEY, true) },
    ]);
    expect(parseProvenance(JSON.parse(JSON.stringify(file))).themes.Warriors.Longbowman.model).toBeNull();
  });
});
