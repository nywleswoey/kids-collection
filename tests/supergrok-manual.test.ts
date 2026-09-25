import { beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { runBakeOff } from "@/shared/pool/bake-off";
import { readImageSize } from "@/shared/pool/image-size";
import { promptHash } from "@/shared/pool/keys";
import {
  findDropFile,
  manualDropStem,
  planManualBrief,
  promptDigest,
  renderManualBrief,
} from "@/shared/pool/manual-brief";
import { ART_STYLE, buildPrompt } from "@/shared/pool/prompt";
import { cardKey } from "@/shared/pool/publish-plan";
import {
  CARD_SIZE,
  ProviderNotDrawn,
  type ImageProvider,
} from "@/shared/pool/providers";
import { supergrokManual } from "@/shared/pool/providers/supergrok-manual";
import { runImageProviderContract } from "./contracts/image-provider-contract";

/**
 * The manual lane, against a fake drop folder. No network: `generate` reads
 * files and normalises them. The shared provider contract is the same one the
 * HTTP adapters run, so a drop-folder lane cannot return a different shape of
 * image than a lane that draws.
 */

const CONTRACT_PROMPT = "a friendly panda";
const dropDir = mkdtempSync(join(tmpdir(), "supergrok-contract-"));

async function noiseImage(
  width: number,
  height: number,
  format: "png" | "jpeg" | "webp",
): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  let n = 1;
  for (let i = 0; i < raw.length; i++) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    raw[i] = n & 0xff;
  }
  const pipeline = sharp(raw, { raw: { width, height, channels: 3 } });
  if (format === "jpeg") return pipeline.jpeg().toBuffer();
  if (format === "webp") return pipeline.webp().toBuffer();
  return pipeline.png().toBuffer();
}

beforeAll(async () => {
  const png = await noiseImage(400, 300, "png");
  writeFileSync(join(dropDir, `panda-${promptDigest(CONTRACT_PROMPT)}.png`), png);
});

runImageProviderContract("supergrok-manual", () => supergrokManual({ dropDir }));

describe("supergrok-manual drop folder", () => {
  it("hashes the same prompt buildPrompt sends, art style included", () => {
    const card = { name: "Longbowman", imagePrompt: "a cheerful archer with a longbow" };
    const prompt = buildPrompt(card);
    expect(prompt).toContain(ART_STYLE);
    expect(promptDigest(prompt)).toBe(promptHash(card));
  });

  it("lists one entry per card the bake-off would draw, with the save filename", () => {
    const themes = [
      {
        name: "Warriors",
        cards: [
          { name: "Longbowman", imagePrompt: "a cheerful archer" },
          { name: "Paladin", imagePrompt: "a knight on grass" },
        ],
      },
    ];
    const planned = new Set([cardKey("Warriors", "Longbowman")]);
    const entries = planManualBrief(themes, planned);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ theme: "Warriors", card: "Longbowman" });
    expect(entries[0]!.prompt).toBe(buildPrompt(themes[0]!.cards[0]!));
    expect(entries[0]!.fileName).toBe(
      `${manualDropStem("Warriors", "Longbowman", entries[0]!.prompt)}.png`,
    );

    const brief = renderManualBrief(entries);
    expect(brief).toContain("## 1. Longbowman");
    expect(brief).toContain(entries[0]!.prompt);
    expect(brief).toContain(entries[0]!.fileName);
    expect(brief).not.toContain("Paladin");
  });

  it("finds jpg, jpeg, webp, and png, and refuses two files for one prompt", () => {
    const prompt = "a red panda";
    const hash = promptDigest(prompt);
    expect(findDropFile(prompt, [`brief.md`, `warriors-panda-${hash}.JPG`])).toEqual({
      kind: "one",
      fileName: `warriors-panda-${hash}.JPG`,
    });
    expect(findDropFile(prompt, [`note-${hash}.jpeg`, `other-${hash}.webp`]).kind).toBe("many");
    expect(findDropFile(prompt, ["brief.md", "unrelated.png"]).kind).toBe("none");
  });

  it("refuses two drop files for one prompt instead of picking one", async () => {
    const dir = mkdtempSync(join(tmpdir(), "supergrok-many-"));
    const prompt = "a panda";
    const hash = promptDigest(prompt);
    writeFileSync(join(dir, `a-${hash}.png`), Buffer.from("not-an-image"));
    writeFileSync(join(dir, `b-${hash}.jpg`), Buffer.from("also-not"));
    await expect(supergrokManual({ dropDir: dir }).generate(prompt, CARD_SIZE)).rejects.toThrow(
      /2 drop files/,
    );
  });

  it("says not drawn when the drop folder has no picture, and does not touch the network", async () => {
    const dir = mkdtempSync(join(tmpdir(), "supergrok-empty-"));
    const provider = supergrokManual({ dropDir: dir });
    const original = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error("network");
    };
    try {
      await expect(provider.generate("nothing saved", CARD_SIZE)).rejects.toBeInstanceOf(
        ProviderNotDrawn,
      );
    } finally {
      globalThis.fetch = original;
    }
    expect(provider.isConfigured()).toBe(true);
    expect(provider.requiredEnv).toEqual([]);
  });

  it("normalises a wrong-sized jpeg into the review bytes, which are what would publish", async () => {
    const dir = mkdtempSync(join(tmpdir(), "supergrok-jpeg-"));
    const card = { name: "Red Panda", imagePrompt: "a red panda sitting on grass" };
    const prompt = buildPrompt(card);
    const fileName = `${manualDropStem("Animals", card.name, prompt)}.jpg`;
    const jpeg = await noiseImage(320, 200, "jpeg");
    writeFileSync(join(dir, fileName), jpeg);

    const fetchCalled = viFetchGuard();
    const provider = supergrokManual({ dropDir: dir });
    let image;
    try {
      image = await provider.generate(prompt, CARD_SIZE);
    } finally {
      fetchCalled.release();
    }

    expect(readImageSize(image.bytes)).toMatchObject({ width: 768, height: 768, format: "png" });
    expect(image.format).toBe("png");
    expect(image.model).toBeUndefined();

    // The reviewed file is the normalised bytes. Publishing reads that file,
    // not the drop folder, so these bytes are the ones `--sync` would upload.
    const reviewPath = join(dir, "reviewed.png");
    writeFileSync(reviewPath, image.bytes);
    expect(Buffer.from(readFileSync(reviewPath)).equals(Buffer.from(image.bytes))).toBe(true);
    expect(Buffer.from(readFileSync(join(dir, fileName))).equals(Buffer.from(image.bytes))).toBe(
      false,
    );
  });

  it("imports one card and leaves the other not drawn, through the bake-off", async () => {
    const dir = mkdtempSync(join(tmpdir(), "supergrok-bake-"));
    const drawn = { name: "Red Panda", imagePrompt: "a red panda" };
    const skipped = { name: "Axolotl", imagePrompt: "an axolotl" };
    const prompt = buildPrompt(drawn);
    writeFileSync(
      join(dir, `${manualDropStem("Animals", drawn.name, prompt)}.webp`),
      await noiseImage(900, 600, "webp"),
    );

    const saved: { provider: ImageProvider; bytes: Uint8Array }[] = [];
    const [outcome] = await runBakeOff(
      [
        { theme: "Animals", card: drawn },
        { theme: "Animals", card: skipped },
      ],
      [supergrokManual({ dropDir: dir })],
      {
        size: CARD_SIZE,
        retries: 1,
        buildPrompt: (card) => buildPrompt(card),
        isReviewed: () => false,
        save: (_job, provider, image) => {
          saved.push({ provider, bytes: image.bytes });
        },
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    );

    expect(outcome).toMatchObject({
      providerId: "supergrok-manual",
      generated: 1,
      failed: 0,
      notDrawn: 1,
      notAttempted: 0,
      abandoned: false,
    });
    expect(saved).toHaveLength(1);
    expect(readImageSize(saved[0]!.bytes)).toMatchObject({
      width: 768,
      height: 768,
      format: "png",
    });
  });
});

/** Fail the test if generate reaches the network. */
function viFetchGuard(): { release(): void } {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("supergrok-manual tried to use the network");
  };
  return {
    release() {
      globalThis.fetch = original;
    },
  };
}
