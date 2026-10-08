import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { promptDigest } from "@/shared/pool/manual-brief";
import {
  animatedReviewFileName,
  animatedStem,
  findAnimatedDropFile,
  readApprovedAnimation,
} from "@/shared/pool/animated-brief";

const PROMPT = "a noble paladin, ART_STYLE";
const PROVIDER_A = "cloudflare-sdxl";
const PROVIDER_B = "supergrok-manual";

describe("animatedStem / animatedReviewFileName", () => {
  it("matches manualDropStem's identity, so still and animation share a key", () => {
    const stem = animatedStem("Warriors", "Paladin", PROMPT, PROVIDER_A);
    expect(stem).toContain(promptDigest(PROMPT));
    expect(animatedReviewFileName("Warriors", "Paladin", PROMPT, PROVIDER_A)).toBe(
      `${stem}.anim.webp`,
    );
  });

  it("differs per still provider, so a changed pick never reuses the old animation", () => {
    expect(animatedReviewFileName("Warriors", "Paladin", PROMPT, PROVIDER_A)).not.toBe(
      animatedReviewFileName("Warriors", "Paladin", PROMPT, PROVIDER_B),
    );
  });
});

describe("findAnimatedDropFile", () => {
  const hash = promptDigest(PROMPT);

  it("matches a WebP file ending in the prompt's hash", () => {
    const fileName = `warriors-paladin-${hash}-${PROVIDER_A}.webp`;
    expect(findAnimatedDropFile(PROMPT, PROVIDER_A, [fileName, "unrelated.webp"])).toEqual({
      kind: "one",
      fileName,
    });
  });

  it("ignores a same-hash file with a non-WebP extension", () => {
    expect(findAnimatedDropFile(PROMPT, PROVIDER_A, [`warriors-paladin-${hash}-${PROVIDER_A}.png`])).toEqual({
      kind: "none",
      hash,
    });
  });

  it("does not match an animation of the same prompt drawn from another provider's still", () => {
    expect(
      findAnimatedDropFile(PROMPT, PROVIDER_B, [`warriors-paladin-${hash}-${PROVIDER_A}.webp`]),
    ).toEqual({ kind: "none", hash });
  });

  it("reports many when more than one file matches the hash", () => {
    const a = `warriors-paladin-${hash}-${PROVIDER_A}.webp`;
    const b = `copy-of-warriors-paladin-${hash}-${PROVIDER_A}.webp`;
    const result = findAnimatedDropFile(PROMPT, PROVIDER_A, [a, b]);
    expect(result.kind).toBe("many");
    if (result.kind === "many") expect(result.fileNames).toEqual([a, b].sort());
  });
});

describe("readApprovedAnimation", () => {
  let dropDir: string;

  afterEach(() => {
    if (dropDir) rmSync(dropDir, { recursive: true, force: true });
  });

  it("returns undefined when the drop folder does not exist", () => {
    expect(readApprovedAnimation(PROMPT, PROVIDER_A, join(tmpdir(), "nonexistent-anim-drop"))).toBeUndefined();
  });

  it("returns undefined when no file matches this prompt", () => {
    dropDir = mkdtempSync(join(tmpdir(), "anim-drop-"));
    writeFileSync(join(dropDir, "unrelated-deadbeef.webp"), "bytes");
    expect(readApprovedAnimation(PROMPT, PROVIDER_A, dropDir)).toBeUndefined();
  });

  it("reads the matching file's bytes", () => {
    dropDir = mkdtempSync(join(tmpdir(), "anim-drop-"));
    const hash = promptDigest(PROMPT);
    writeFileSync(join(dropDir, `warriors-paladin-${hash}-${PROVIDER_A}.webp`), "fake-webp-bytes");
    const bytes = readApprovedAnimation(PROMPT, PROVIDER_A, dropDir);
    expect(bytes && new TextDecoder().decode(bytes)).toBe("fake-webp-bytes");
  });

  it("does not reuse provider A's animation once the pick changes to provider B", () => {
    dropDir = mkdtempSync(join(tmpdir(), "anim-drop-"));
    const hash = promptDigest(PROMPT);
    writeFileSync(join(dropDir, `warriors-paladin-${hash}-${PROVIDER_A}.webp`), "a");
    expect(readApprovedAnimation(PROMPT, PROVIDER_A, dropDir)).toBeDefined();
    expect(readApprovedAnimation(PROMPT, PROVIDER_B, dropDir)).toBeUndefined();
  });

  it("throws when more than one file matches this prompt", () => {
    dropDir = mkdtempSync(join(tmpdir(), "anim-drop-"));
    const hash = promptDigest(PROMPT);
    writeFileSync(join(dropDir, `warriors-paladin-${hash}-${PROVIDER_A}.webp`), "a");
    writeFileSync(join(dropDir, `copy-warriors-paladin-${hash}-${PROVIDER_A}.webp`), "b");
    expect(() => readApprovedAnimation(PROMPT, PROVIDER_A, dropDir)).toThrow(/Leave one/);
  });
});
