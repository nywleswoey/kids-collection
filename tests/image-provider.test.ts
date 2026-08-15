import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runHttpProviderContract,
  runImageProviderContract,
  type ContractFixtures,
} from "./contracts/image-provider-contract";
import { fakeProvider, solidPng } from "@/features/pool/providers/fake";
import { pollinations } from "@/features/pool/providers/pollinations";
import { cloudflareSdxl } from "@/features/pool/providers/cloudflare-sdxl";
import { aiHorde } from "@/features/pool/providers/ai-horde";
import { CARD_SIZE, ProviderRetryable } from "@/features/pool/providers";

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

/**
 * Smallest byte sequence `readImageSize` will read as a lossy WebP of a given
 * size: a RIFF/WEBP container holding a VP8 chunk whose frame header carries the
 * start code and two 14-bit dimensions. Not decodable as a picture.
 */
function syntheticWebp(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  b.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  b.set([0x56, 0x50, 0x38, 0x20], 12); // "VP8 "
  b.set([0x9d, 0x01, 0x2a], 23); // start code
  b[26] = width & 0xff;
  b[27] = (width >> 8) & 0x3f;
  b[28] = height & 0xff;
  b[29] = (height >> 8) & 0x3f;
  return b;
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
const webpFixtures = makeFixtures(syntheticWebp, solidPng);

/**
 * AI Horde needs four round-trips where the others need one, so the shared
 * fixtures cannot simply be the answer to every call (#67: "ONE logical attempt,
 * however many HTTP round-trips that takes").
 *
 * The routing is chosen so the contract still asserts what it means to assert.
 * A non-200 fixture is returned from the SUBMIT, which is where the retry
 * taxonomy has to hold — a 429 on submit must be retryable, a 400 must not. A
 * 200 fixture is carried all the way to the image DOWNLOAD, which is where the
 * size, format and not-an-image checks belong. Either way the fixture is what
 * decides the outcome; only the round-trip it lands on differs.
 */
function scriptedHorde(respond: () => Response) {
  return async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (url.includes("/generate/async")) {
      const fixture = respond();
      if (!fixture.ok) return fixture;
      return Response.json({ id: "job-1", kudos: 24 });
    }
    if (url.includes("/generate/check/")) {
      return Response.json({ done: true, faulted: false, is_possible: true, finished: 1 });
    }
    if (url.includes("/generate/status/")) {
      return Response.json({
        done: true,
        faulted: false,
        generations: [
          {
            img: "https://r2.example/job-1.webp",
            seed: "42",
            // Deliberately NOT the model that was requested — see #64.
            model: "SomeOtherModel",
            worker_name: "volunteer-7",
            state: "ok",
            censored: false,
          },
        ],
      });
    }
    return respond();
  };
}

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
    process.env.AIHORDE_API_KEY = "test-key";
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

  runHttpProviderContract(
    "ai-horde",
    (respond) => aiHorde({ fetchImpl: scriptedHorde(respond), sleep: async () => {} }),
    webpFixtures,
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

  it("needs no credential — the free registered tier no longer exists (#69)", () => {
    // #67 originally required POLLINATIONS_TOKEN, on the premise that the "seed"
    // tier bought 3x the anonymous rate. Measured live: auth.pollinations.ai is
    // gone, the tiers are replaced by prepaid Pollen, and every image model is
    // priced — so the credentialled path is a paywall #72 forbids crossing.
    delete process.env.POLLINATIONS_TOKEN;
    expect(pollinations().isConfigured()).toBe(true);
    expect(pollinations().requiredEnv).toEqual([]);
  });

  it("sends no credential — the legacy host ignores one", () => {
    process.env.POLLINATIONS_TOKEN = "sk_should_not_be_sent";
    let sentAuth: unknown = "unset";
    const provider = pollinations({
      fetchImpl: async (_input, init) => {
        sentAuth = (init?.headers as Record<string, string> | undefined)?.Authorization;
        return imageResponse(syntheticJpeg(768, 768));
      },
    });
    return provider.generate("x", CARD_SIZE).then(() => {
      // Sending a secret somewhere that ignores it is worse than sending none.
      expect(sentAuth).toBeUndefined();
    });
  });

  it("paces as a serial cap, not a rate — one queued request per IP", () => {
    // The anonymous limit is no longer "one request every 15s": a second
    // concurrent request answers 429 "Queue full for IP … (max: 1)".
    expect(pollinations().concurrency).toBe(1);
    expect(pollinations().minIntervalMs).toBeGreaterThanOrEqual(15_000);
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

describe("ai-horde adapter (#74)", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.AIHORDE_API_KEY = "test-key";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  const okWebp = () => imageResponse(syntheticWebp(768, 768));

  /** Run one generation and hand back the body the adapter POSTed to /generate/async. */
  async function capturedSubmit(): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    const scripted = scriptedHorde(okWebp);
    const provider = aiHorde({
      sleep: async () => {},
      fetchImpl: async (input, init) => {
        if (String(input).includes("/generate/async")) {
          body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        }
        return scripted(input);
      },
    });
    await provider.generate("a longbowman", CARD_SIZE);
    return body;
  }

  it("always names exactly one model — never leaves `models` unset", async () => {
    // Two separate risks, both measured during #74 and both fatal:
    //
    //   Resolution. An unpinned request is capped at
    //   `1024 + threads*10 - round(queue*0.9)`. Measured mid-run: 15 threads,
    //   728 queued -> 519px. 768 would have been REFUSED outright, not
    //   downgraded — this is not a tail risk, it is the normal case.
    //
    //   Content. The highest-worker-count image models on the horde are NSFW
    //   (WAI-NSFW-illustrious-SDXL, Pony Diffusion XL, CyberRealistic Pony), so
    //   an unpinned request in a kids' app is routed by popularity straight at
    //   them.
    const body = await capturedSubmit();
    expect(Array.isArray(body.models)).toBe(true);
    expect(body.models).toHaveLength(1);
    expect((body.models as string[])[0]).toBe(aiHorde().params.model);
    expect((body.models as string[])[0]).not.toBe("");
  });

  it("never sets allow_downgrade (#71)", async () => {
    // Setting it permits a SMALLER image than asked for. That is the precise
    // failure the model pin exists to prevent, so the adapter must not hold both
    // ends of the argument. Asserting the key is ABSENT, not false: the horde
    // reads presence.
    expect(Object.keys(await capturedSubmit())).not.toContain("allow_downgrade");
  });

  it("sends #71's routing parameters and asks for an SFW image", async () => {
    const body = await capturedSubmit();
    // slow_workers: at 0 kudos the slow volunteers ARE the queue — excluding
    // them is excluding the horde.
    expect(body.slow_workers).toBe(true);
    // replacement_filter: never let the horde silently rewrite the prompt, which
    // would make the review file's promptHash a lie.
    expect(body.replacement_filter).toBe(false);
    expect(body.nsfw).toBe(false);
  });

  it("asks for exactly one image at exactly the card size", async () => {
    const body = await capturedSubmit();
    const params = body.params as Record<string, unknown>;
    expect(params.width).toBe(CARD_SIZE.width);
    expect(params.height).toBe(CARD_SIZE.height);
    expect(params.n).toBe(1);
  });

  it("builds its request from params and nothing else", async () => {
    // The port's rule, enforced rather than asserted: "generate() must build its
    // request from {prompt, size, ...params} and nothing else, so that 'does
    // this adapter read anything outside params?' is a checkable review
    // question rather than a hope."
    //
    // This walks the request in the OTHER direction — from the wire back to the
    // declared bag — so a knob added to the body without a matching param fails
    // here. Checking only the knobs you remembered to list would assert the
    // title of this test and not its rule; that is how `r2` (which decides the
    // delivery encoding, and therefore `format`, and therefore the review file's
    // extension) sat unhashed.
    const body = await capturedSubmit();
    const declared = aiHorde().params;

    // Everything the horde is told, flattened. `params` is the nested sampling
    // bag; the rest are top-level routing fields.
    const sent: Record<string, unknown> = {
      ...(body.params as Record<string, unknown>),
      ...body,
    };
    delete sent.params;

    // Not parameters: the prompt and size are generate()'s own arguments, `n` is
    // fixed by the port (one call, one card), and `models` is the wire's array
    // spelling of the declared scalar `model`.
    const notParams = new Set(["prompt", "width", "height", "n", "models"]);

    for (const [key, value] of Object.entries(sent)) {
      if (notParams.has(key)) continue;
      expect(declared, `"${key}" is sent to the horde but is not a declared param`).toHaveProperty(
        key,
      );
      // The horde's `seed` is a string on the wire where every other adapter's
      // is a number. The declared param stays a number so `paramHash` sees the
      // same shape everywhere; only the encoding differs.
      expect(String(value), `params.${key}`).toBe(String(declared[key]));
    }
    expect(body.models).toEqual([declared.model]);
  });

  it("hashes the routing parameters, because on this provider they decide the bytes", async () => {
    // A regression guard with teeth: flipping any of these changes the review
    // filename, so a reviewed candidate can never be silently re-attributed to a
    // different request. `r2` is the sharpest case — it swaps WebP for inline
    // base64 PNG, i.e. it changes `format` and the file's extension.
    const declared = aiHorde().params;
    for (const key of [
      "replacement_filter",
      "nsfw",
      "slow_workers",
      "r2",
      "shared",
      "trusted_workers",
    ]) {
      expect(declared, `${key} must be hashed`).toHaveProperty(key);
    }
  });

  it("reports the model the WORKER named, not the one it requested (#64)", async () => {
    const provider = aiHorde({ fetchImpl: scriptedHorde(okWebp), sleep: async () => {} });
    const image = await provider.generate("x", CARD_SIZE);
    expect(image.model).toBe("SomeOtherModel");
    expect(image.model).not.toBe(provider.params.model);
  });

  it("polls until the job is done rather than returning the first check (#67)", async () => {
    // One generate() call is ONE logical attempt however many round-trips it
    // takes. If the adapter gave up at the first not-done check, every real
    // generation would fail — nothing at the back of a 350-deep queue is ready
    // on the first poll.
    let checks = 0;
    const scripted = scriptedHorde(okWebp);
    const provider = aiHorde({
      sleep: async () => {},
      fetchImpl: async (input, init) => {
        if (String(input).includes("/generate/check/")) {
          checks++;
          if (checks < 3) {
            return Response.json({ done: false, faulted: false, is_possible: true, finished: 0 });
          }
        }
        return scripted(input, init);
      },
    });
    const image = await provider.generate("x", CARD_SIZE);
    expect(checks).toBe(3);
    expect(image.bytes.byteLength).toBeGreaterThan(0);
  });

  it("treats a worker's censorship as retryable, not as a drawing (#71)", async () => {
    // Per-worker censorship returns a BLACK FRAME rather than a refusal. #71
    // accepted that risk on the grounds it fails visibly into review — but a
    // black frame saved to seed/review/ is not visible, it is a card that looks
    // like the model drew nothing. It is also one volunteer's filter, not a
    // verdict on the prompt, so another worker is a real remedy: retryable.
    const provider = aiHorde({
      sleep: async () => {},
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/generate/async")) return Response.json({ id: "job-1" });
        if (url.includes("/generate/check/")) {
          return Response.json({ done: true, faulted: false, is_possible: true });
        }
        if (url.includes("/generate/status/")) {
          return Response.json({
            done: true,
            generations: [{ img: "https://r2.example/x.webp", model: "m", censored: true }],
          });
        }
        return okWebp();
      },
    });
    const err = await provider.generate("x", CARD_SIZE).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderRetryable);
    expect(String(err)).toMatch(/censor/i);
  });

  it("fails a faulted job instead of polling it to the deadline", async () => {
    const provider = aiHorde({
      sleep: async () => {},
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/generate/async")) return Response.json({ id: "job-1" });
        return Response.json({ done: false, faulted: true, is_possible: true });
      },
    });
    await expect(provider.generate("x", CARD_SIZE)).rejects.toThrow(/fault/i);
  });

  it("gives up when no worker can serve the request", async () => {
    // `is_possible: false` means nothing online can satisfy it — which is what a
    // model going offline looks like. Volunteer infrastructure: the set moves.
    const provider = aiHorde({
      sleep: async () => {},
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/generate/async")) return Response.json({ id: "job-1" });
        return Response.json({ done: false, faulted: false, is_possible: false });
      },
    });
    await expect(provider.generate("x", CARD_SIZE)).rejects.toThrow(/no worker/i);
  });

  it("treats a 404 from /check as the horde dropping the job, and retries", async () => {
    // Measured on #74's second run: 27 of 46 images were lost this way. A job
    // that goes stale does NOT time out — the horde forgets it and /check
    // answers 404 while the job is still advancing in the queue. Left as a bare
    // HTTP error this is non-retryable (4xx), so the runner's circuit breaker
    // counts three of them and abandons the lane, reporting a dead provider for
    // what is really an empty wallet.
    const provider = aiHorde({
      sleep: async () => {},
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/generate/async")) return Response.json({ id: "job-1" });
        return new Response(null, { status: 404 });
      },
    });
    const err = await provider.generate("x", CARD_SIZE).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderRetryable);
    expect(String(err)).toMatch(/dropped|stale/i);
  });

  it("gives up after the deadline rather than polling forever", async () => {
    // Requests expire uncollected at the back of the queue. #74 measured a
    // queue position of 352 and a ~2850s wait at 0 kudos, so this is the
    // ordinary case, not an edge one — and resubmitting is exactly the remedy.
    const provider = aiHorde({
      sleep: async () => {},
      pollTimeoutMs: 0,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/generate/async")) return Response.json({ id: "job-1" });
        return Response.json({ done: false, faulted: false, is_possible: true });
      },
    });
    const err = await provider.generate("x", CARD_SIZE).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderRetryable);
  });

  it("is an escape hatch, not a bake-off lane (#71)", () => {
    expect(aiHorde().role).toBe("escape-hatch");
  });

  it("paces for a limit that is per-IP across the whole API, not per-endpoint", () => {
    // Measured on #74's first run: the horde answers 429 {"message":"2 per 1
    // second"} and three lanes fanning out lost 7 of 12 submissions in the first
    // second. One request in flight at a time is the only honest way to declare
    // that through a seam whose gate is per-lane.
    expect(aiHorde().minIntervalMs).toBeGreaterThanOrEqual(500);
    expect(aiHorde().concurrency).toBe(1);
  });

  it("needs its key", () => {
    delete process.env.AIHORDE_API_KEY;
    expect(aiHorde().isConfigured()).toBe(false);
    expect(aiHorde().requiredEnv).toContain("AIHORDE_API_KEY");
  });
});
