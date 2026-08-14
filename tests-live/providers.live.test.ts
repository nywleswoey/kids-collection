import { describe, it, expect } from "vitest";
import { runImageProviderContract } from "../tests/contracts/image-provider-contract";
import { readImageSize } from "@/features/pool/image-size";
import { buildPrompt } from "@/features/pool/prompt";
import { CARD_SIZE, PROVIDERS } from "@/features/pool/providers";

/**
 * The shared ImageProvider contract, run against the REAL endpoints (#67).
 *
 *   pnpm test:providers
 *
 * The fixture-driven run in `tests/image-provider.test.ts` proves an adapter
 * parses and maps errors correctly. It cannot prove the wire format is still the
 * one the provider speaks — only this can, which is why the same spec exists
 * twice rather than being replaced.
 *
 * Not in CI, on purpose: quota on every push, flaky by construction on any
 * queue-backed provider, and against #68's "$0 stays $0 structurally".
 *
 * An unconfigured provider is SKIPPED rather than failed — the whole point is to
 * be runnable with whatever keys you happen to hold — but the skip is announced,
 * because a green run over zero providers proves nothing.
 */

/**
 * Run-unique salt, so a salted prompt has never been requested before and is
 * therefore guaranteed to be generated rather than served from a provider cache.
 */
const SALT = `kc-live-${Date.now()}`;

const configured = PROVIDERS.filter((p) => p.isConfigured());
const skipped = PROVIDERS.filter((p) => !p.isConfigured());

if (skipped.length > 0) {
  console.warn(
    `\n⚠️  Skipping ${skipped.length} unconfigured provider(s):\n` +
      skipped.map((p) => `   ${p.id} — needs ${p.requiredEnv.join(", ")}`).join("\n") +
      `\n`,
  );
}

describe("live providers", () => {
  it("reports what it actually exercised", () => {
    console.log(
      `Live contract over ${configured.length}/${PROVIDERS.length} provider(s): ` +
        `${configured.map((p) => p.id).join(", ") || "(none)"}`,
    );
    expect(PROVIDERS.length).toBeGreaterThan(0);
  });
});

for (const provider of configured) {
  runImageProviderContract(`${provider.id} (live)`, () => provider);

  describe(`${provider.id} — live specifics`, () => {
    it("draws a realistic card prompt at 768x768, freshly generated", async () => {
      // Salted so this is a genuine generation rather than a cache replay.
      //
      // Measured while resolving #67: Pollinations serves a repeated prompt from
      // a durable, cross-user cache, and a cached response carries neither
      // `x-auth-status` nor `x-model-used`. So an unsalted live suite quietly
      // degrades into replaying bytes it generated on a previous run — every
      // assertion green, nothing actually exercised, and a rejected credential
      // invisible. The contract's own prompts have that weakness by nature;
      // these two are where it is bought back.
      const image = await provider.generate(
        buildPrompt({ imagePrompt: `an English longbowman holding a longbow, ${SALT}` }),
        CARD_SIZE,
      );
      const measured = readImageSize(image.bytes);
      expect(measured).toMatchObject({ width: 768, height: 768 });
      expect(image.bytes.byteLength).toBeGreaterThan(1024);
    });

    it("reports which model actually served the request, where it can", async () => {
      // #64 caught Pollinations swapping FLUX for `sana` with no changelog. If
      // this prints something other than what `params.model` asked for, that is
      // the finding — and it means every review file predating the swap is art
      // from a different model. Salted, because the header only rides on a real
      // generation.
      const image = await provider.generate(
        buildPrompt({ imagePrompt: `a red panda, ${SALT}` }),
        CARD_SIZE,
      );
      console.log(
        `   ${provider.id}: requested ${String(provider.params.model)}, ` +
          `served ${image.model ?? "(not reported)"}`,
      );
      if (image.model !== undefined) expect(typeof image.model).toBe("string");
    });
  });
}
