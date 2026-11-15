/**
 * In-memory fake provider — the tests' seam (#67).
 *
 * The thing being replaced is `fetchImpl` injection at the top of
 * `generateImage`. That was the wrong altitude once there is more than one
 * provider: a test stubbing fetch has to know each provider's wire format, so it
 * asserts on URLs and JSON bodies and breaks when a request shape changes for
 * reasons that have nothing to do with behaviour. A fake PROVIDER lets the seed
 * runner be tested against the port instead — lanes, pacing, retry and the
 * circuit breaker, none of which involve HTTP at all.
 *
 * It emits a real, correctly-sized PNG so it passes the same contract every HTTP
 * adapter does. A fake that returned `new Uint8Array([1,2,3])` would conform to
 * the type and to nothing else, and the contract suite would have to carve out
 * an exception for it — at which point the contract stops proving the fake and
 * the real adapters agree, which is the entire point of running it against both.
 */
import { deflateSync } from "node:zlib";
import type {
  GeneratedImage,
  ImageProvider,
  ImageSizeRequest,
  ProviderParams,
} from "./provider";

export interface FakeProviderOptions {
  id?: string;
  role?: ImageProvider["role"];
  params?: ProviderParams;
  minIntervalMs?: number;
  concurrency?: number;
  configured?: boolean;
  model?: string;
  /**
   * Per-call behaviour, consumed in order. Anything beyond the scripted entries
   * succeeds — so a test scripts only the interesting prefix.
   */
  script?: Array<"ok" | Error>;
}

export interface FakeProvider extends ImageProvider {
  /** Prompts seen, in call order — lets a test assert what a lane attempted. */
  readonly calls: string[];
}

/** In-memory fake image provider for testing. Returns scripted responses and records calls. */
export function fakeProvider(opts: FakeProviderOptions = {}): FakeProvider {
  const calls: string[] = [];
  const script = [...(opts.script ?? [])];
  let n = 0;
  return {
    id: opts.id ?? "fake",
    role: opts.role ?? "lane",
    format: "png",
    params: opts.params ?? { model: "fake-1", seed: 42 },
    minIntervalMs: opts.minIntervalMs ?? 0,
    concurrency: opts.concurrency ?? 1,
    requiredEnv: [],
    isConfigured: () => opts.configured ?? true,
    calls,
    async generate(prompt: string, size: ImageSizeRequest): Promise<GeneratedImage> {
      calls.push(prompt);
      const step = script[n++];
      if (step instanceof Error) throw step;
      return { bytes: picturePng(size.width, size.height), format: "png", model: opts.model };
    },
  };
}

/**
 * Smallest valid PNG of the requested size: one IHDR, one IDAT of zeroed
 * scanlines, one IEND. `node:zlib` is already in the runtime, so this adds no
 * dependency — which matters, because the alternative was checking a binary
 * fixture into the repo for every size a test wants.
 *
 * Zeroed scanlines are an ALL-BLACK frame, which is the exact artefact #78 is
 * about: at 768x768 this encodes to ~1.7 KB, against the 1.8 KB Cloudflare SDXL
 * actually returned. So this is no longer a stand-in for a card — it is the
 * fixture for the failure, and `picturePng` is what a provider is supposed to
 * return.
 */
export function solidPng(width: number, height: number): Uint8Array {
  return encodePng(width, height, Buffer.alloc(height * (1 + width * 3)));
}

/**
 * A PNG with the information density of an actual drawing (#78).
 *
 * The seam now refuses a frame that carries no subject, measured as encoded
 * bytes per pixel, so a fake emitting `solidPng` would emit precisely the thing
 * every real adapter is now required to reject — and every seed-runner test
 * would be pushing bytes through the port that no lane could ever produce.
 *
 * A diagonal gradient plus a low-amplitude dither, which is not a picture of
 * anything but compresses like one: ~0.78 bytes/pixel at 768x768, against
 * 1.27-1.53 for a real Cloudflare card and 0.02 for the floor. The dither is
 * what buys that — a clean gradient compresses almost as far as a flat frame.
 */
export function picturePng(width: number, height: number): Uint8Array {
  const raw = Buffer.alloc(height * (1 + width * 3));
  let p = 0;
  let noise = 1;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0;
      const dither = noise & 3;
      raw[p++] = ((x >> 1) + dither) & 0xff;
      raw[p++] = ((y >> 1) + dither) & 0xff;
      raw[p++] = (128 + dither) & 0xff;
    }
  }
  return encodePng(width, height, raw);
}

/** Wrap already-filtered scanlines as a truecolour 8-bit PNG. */
function encodePng(width: number, height: number, raw: Buffer): Uint8Array {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
