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

describe("animatedStem / animatedReviewFileName", () => {
  it("matches manualDropStem's identity, so still and animation share a key", () => {
    const stem = animatedStem("Warriors", "Paladin", PROMPT);
    expect(stem).toContain(promptDigest(PROMPT));
    expect(animatedReviewFileName("Warriors", "Paladin", PROMPT)).toBe(`${stem}.anim.webp`);
  });
});

describe("findAnimatedDropFile", () => {
  const hash = promptDigest(PROMPT);

  it("matches a WebP file ending in the prompt's hash", () => {
    const fileName = `warriors-paladin-${hash}.webp`;
    expect(findAnimatedDropFile(PROMPT, [fileName, "unrelated.webp"])).toEqual({
      kind: "one",
      fileName,
    });
  });

  it("ignores a same-hash file with a non-WebP extension", () => {
    expect(findAnimatedDropFile(PROMPT, [`warriors-paladin-${hash}.png`])).toEqual({
      kind: "none",
      hash,
    });
  });

  it("reports many when more than one file matches the hash", () => {
    const a = `warriors-paladin-${hash}.webp`;
    const b = `copy-of-warriors-paladin-${hash}.webp`;
    const result = findAnimatedDropFile(PROMPT, [a, b]);
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
    expect(readApprovedAnimation(PROMPT, join(tmpdir(), "nonexistent-anim-drop"))).toBeUndefined();
  });

  it("returns undefined when no file matches this prompt", () => {
    dropDir = mkdtempSync(join(tmpdir(), "anim-drop-"));
    writeFileSync(join(dropDir, "unrelated-deadbeef.webp"), "bytes");
    expect(readApprovedAnimation(PROMPT, dropDir)).toBeUndefined();
  });

  it("reads the matching file's bytes", () => {
    dropDir = mkdtempSync(join(tmpdir(), "anim-drop-"));
    const hash = promptDigest(PROMPT);
    writeFileSync(join(dropDir, `warriors-paladin-${hash}.webp`), "fake-webp-bytes");
    const bytes = readApprovedAnimation(PROMPT, dropDir);
    expect(bytes && new TextDecoder().decode(bytes)).toBe("fake-webp-bytes");
  });

  it("throws when more than one file matches this prompt", () => {
    dropDir = mkdtempSync(join(tmpdir(), "anim-drop-"));
    const hash = promptDigest(PROMPT);
    writeFileSync(join(dropDir, `warriors-paladin-${hash}.webp`), "a");
    writeFileSync(join(dropDir, `copy-warriors-paladin-${hash}.webp`), "b");
    expect(() => readApprovedAnimation(PROMPT, dropDir)).toThrow(/Leave one/);
  });
});
