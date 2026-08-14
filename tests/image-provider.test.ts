import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runHttpProviderContract,
  runImageProviderContract,
  type ContractFixtures,
} from "./contracts/image-provider-contract";
import { fakeProvider, solidPng } from "@/features/pool/providers/fake";
import { pollinations } from "@/features/pool/providers/pollinations";
import { cloudflareSdxl } from "@/features/pool/providers/cloudflare-sdxl";
import { CARD_SIZE } from "@/features/pool/providers";

/**
 * The provider contract, run against every implementation (#67).
 *
 * The real adapters are driven by recorded fixtures rather than the network:
 * live calls in CI would burn quota on every push, be flaky by construction, and
 * conflict with #68's "$0 is structural". The same spec runs live behind
 * `pnpm test:providers`, which is where an adapter's wire format is actually
 * proven against the provider.
 *
 * Note the fixtures are per-adapter, because the providers do not agree on
 * anything: Pollinations answers a GET with a JPEG body, Cloudflare answers a
 * POST with a PNG one. That disagreement is exactly what the port hides, and
 * writing the fixtures separately is what proves it hides it.
 */

// ── fixture bytes ────────────────────────────────────────────────────────────

/**
 * Smallest byte sequence `readImageSize` will read as a JPEG of a given size:
 * SOI, an APP0 segment (so the marker walk has something to step over, as it
 * does on a real Pollinations response that carries EXIF), a SOF0 frame header,
 * then EOI. Not decodable as a picture — nothing here decodes pictures.
 */
function syntheticJpeg(width: number, height: number): Uint8Array {
  const sof = [
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ];
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0, length 4
    ...sof,
    0xff, 0xd9, // EOI
  ]);
}

function imageResponse(bytes: Uint8Array): Response {
  return new Response(bytes as unknown as BodyInit, { status: 200 });
}

function makeFixtures(
  image: (w: number, h: number) => Uint8Array,
  otherFormat: (w: number, h: number) => Uint8Array,
): ContractFixtures {
  return {
    ok: () => imageResponse(image(CARD_SIZE.width, CARD_SIZE.height)),
    wrongSize: () => imageResponse(image(512, 512)),
    // Right size, right everything — except the encoding the adapter promises.
    wrongFormat: () => imageResponse(otherFormat(CARD_SIZE.width, CARD_SIZE.height)),
    notAnImage: () =>
      new Response("<html><body>upstream error</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    rateLimited: (retryAfterSeconds?: number) =>
      new Response(null, {
        status: 429,
        headers:
          retryAfterSeconds === undefined
            ? undefined
            : { "retry-after": String(retryAfterSeconds) },
      }),
    serverError: () => new Response(null, { status: 500 }),
    rejected: () => new Response(null, { status: 400 }),
  };
}

const jpegFixtures = makeFixtures(syntheticJpeg, solidPng);
const pngFixtures = makeFixtures(solidPng, syntheticJpeg);

// ── the runs ─────────────────────────────────────────────────────────────────

runImageProviderContract("in-memory fake", () => fakeProvider());

describe("real adapters", () => {
  // The adapters read credentials at request time. Set them so `generate` builds
  // a well-formed request; nothing reaches the network — `fetchImpl` is the
  // fixture.
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.POLLINATIONS_TOKEN = "test-token";
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  runHttpProviderContract(
    "pollinations",
    (respond) => pollinations({ fetchImpl: async () => respond() }),
    jpegFixtures,
  );

  runHttpProviderContract(
    "cloudflare-sdxl",
    (respond) => cloudflareSdxl({ fetchImpl: async () => respond() }),
    pngFixtures,
  );
});

// ── adapter specifics the shared contract cannot express ─────────────────────

describe("pollinations adapter", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reports the model the response NAMED, not the one it requested (#64)", async () => {
    process.env.POLLINATIONS_TOKEN = "t";
    const provider = pollinations({
      fetchImpl: async () =>
        new Response(syntheticJpeg(768, 768) as unknown as BodyInit, {
          status: 200,
          headers: { "x-model-used": "sana" },
        }),
    });
    const image = await provider.generate("a panda", CARD_SIZE);
    // The request asked for flux; the response says sana. That gap is the whole
    // reason `model` exists on the result — it was the only witness #64 had.
    expect(provider.params.model).toBe("flux");
    expect(image.model).toBe("sana");
  });

  it("pins the seed explicitly rather than inheriting the server default (#64)", async () => {
    process.env.POLLINATIONS_TOKEN = "t";
    let seen = "";
    const provider = pollinations({
      fetchImpl: async (url) => {
        seen = String(url);
        return imageResponse(syntheticJpeg(768, 768));
      },
    });
    await provider.generate("a panda", CARD_SIZE);
    expect(seen).toContain("seed=42");
    expect(seen).toContain(`width=${CARD_SIZE.width}&height=${CARD_SIZE.height}`);
  });

  it("is unconfigured without a token — the seed tier is not optional", () => {
    delete process.env.POLLINATIONS_TOKEN;
    expect(pollinations().isConfigured()).toBe(false);
    expect(pollinations().requiredEnv).toContain("POLLINATIONS_TOKEN");
  });
});

describe("cloudflare-sdxl adapter", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("posts the size explicitly — the reason it is SDXL and not flux-1-schnell (#62)", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    let body: Record<string, unknown> = {};
    let url = "";
    const provider = cloudflareSdxl({
      fetchImpl: async (input, init) => {
        url = String(input);
        body = JSON.parse(String(init?.body));
        return imageResponse(solidPng(768, 768));
      },
    });
    await provider.generate("a panda", CARD_SIZE);
    expect(body.width).toBe(768);
    expect(body.height).toBe(768);
    expect(body.seed).toBe(42);
    expect(url).toContain("/accounts/acct/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0");
  });

  it("witnesses no serving model, and says so by leaving it undefined", async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    const provider = cloudflareSdxl({
      fetchImpl: async () => imageResponse(solidPng(768, 768)),
    });
    expect((await provider.generate("x", CARD_SIZE)).model).toBeUndefined();
  });

  it("needs both credentials", () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    expect(cloudflareSdxl().isConfigured()).toBe(false);
  });
});
