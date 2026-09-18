/**
 * PROTOTYPE — #79. Throwaway. Do not import this from anything.
 *
 * The question: Cloudflare SDXL's cards are ~10x heavier than Pollinations'.
 * Who pays for that? #79 named two payers — the Blob allowance and "a
 * seven-year-old's connection" — and two possible remedies: re-encode, or ask
 * Cloudflare for something lighter.
 *
 * This is the run behind both answers. The store side needs no prototype
 * (`pnpm seed --blob-budget` is the shipped command and reads the real numbers);
 * these are the two measurements that would otherwise be assertions in a commit
 * body, which is the state #79 was complaining about in the first place.
 *
 *   pnpm prototype:79 --delivered    what a BROWSER actually downloads
 *   pnpm prototype:79 --steer        can Cloudflare be asked for fewer bytes?
 *
 * ── --delivered: the source weight is not the delivered weight ───────────────
 * Every card surface renders through `next/image` (`CardImage` is the only
 * component that draws card art; there is no raw <img> anywhere), so a browser
 * downloads a re-encoded WebP at the width it asked for and never the stored
 * bytes. This uploads one image per lane to Blob under `probe-79/`, asks the
 * PRODUCTION optimizer for each width the app actually requests, weighs what
 * comes back, and deletes the probes.
 *
 * Measured 2026-08-15, `q=75`, WebP. Two runs, because this lane is not
 * deterministic (#66) and #81's standing lesson is that a conclusion drawn from
 * one run of a non-deterministic lane is worth re-drawing:
 *
 *                          source      w=128   w=256   w=512   w=1080
 *   run 1
 *   cloudflare-sdxl        937.9 KB     4.7     14.4    39.5     73.1
 *   cloudflare-lightning   147.9 KB     6.6     24.9    68.4    110.7
 *   pollinations            41.5 KB     1.8      4.1     9.6     16.3
 *   run 2
 *   cloudflare-sdxl        924.7 KB     4.1     11.8    32.2     64.9
 *   cloudflare-lightning   108.7 KB     6.1     17.9    44.2     71.7
 *   pollinations            44.1 KB     1.9      4.5    10.5     17.5
 *
 * The ordering INVERTS, in both runs: an ~8x heavier source delivers ~30%
 * LIGHTER than the middle one. Delivered weight tracks how busy the picture is,
 * not how heavy the file was — so the 14x does not survive the optimizer as
 * bytes OR as a correlation, and the child-facing half of #79 is answered
 * "nobody pays". Everything reaching a browser is 2-70 KB whichever lane drew
 * it, against a stored range of 41 KB to 938 KB.
 *
 * Read it as three points, not a law. Each lane drew its own picture, so this
 * compares three subjects as much as three encoders; what it establishes is
 * that the delivered band is 2-70 KB for all of them and that source weight
 * does not order it. A stronger design would put the same picture through both
 * encoders, which no image dependency in this repo can do — which is itself
 * part of the answer to "where would a re-encode live".
 *
 * The widths are not arbitrary: `CardImage` is used at dim 110/200/256/512, and
 * `next.config.ts` allows imageSizes 128/256/512 + deviceSizes 640/1080, so a
 * card is transformed at 128, 256, 512 and 1080 and at no other width. That is
 * the 4 in "a 30-card theme costs at most 30 x 4 = 120 transformations".
 *
 * ── --steer: SDXL has no output-format lever; a different model does ─────────
 * Measured the same day, same prompt, against the live endpoint:
 *
 *                                                          run 1     run 2
 *   stable-diffusion-xl-base-1.0                     PNG   696.1 KB  852.1 KB
 *   ... + `Accept: image/jpeg`                       PNG   698.7 KB  796.0 KB
 *   ... + `response_format: "jpeg"` in the body      PNG   744.1 KB  816.5 KB
 *   stable-diffusion-xl-lightning                    JPEG   88.2 KB  107.1 KB
 *
 * The within-run spread across the three sdxl arms (48 KB, 56 KB) is smaller
 * than the between-run spread on the SAME arm (696 -> 852 KB), which is what
 * makes "no effect" the reading rather than "a small effect".
 *
 * Two things worth knowing. SDXL's schema has no output-format parameter and
 * the endpoint DROPS keys it does not know rather than refusing them, so an
 * invented one returns 200 and looks like it worked — the size difference
 * between those three rows is this lane's ordinary non-determinism (#66), not
 * an effect. And `-lightning` answers JPEG while its `content-type` header
 * still says `image/png`, which is one more reason `finishGeneration` sniffs
 * bytes instead of trusting headers.
 *
 * So the lever for "ask Cloudflare for less" exists and it is a MODEL, not a
 * parameter. It is deliberately not registered: a model swap is a quality
 * decision belonging to a bake-off and to the roster (#69), and `-lightning` is
 * a distilled model whose output at these step counts nobody has judged.
 *
 * Requires CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN, and for `--delivered`
 * also BLOB_READ_WRITE_TOKEN. `--delivered` writes 3 objects to the real store
 * and deletes them again; `del()` is free and the probes are namespaced away
 * from `cards/` so a failed run strands nothing a card could be confused with.
 */
import { put, del } from "@vercel/blob";
import { ART_STYLE } from "@/features/pool/prompt";
import { readImageSize } from "@/features/pool/image-size";
import { CARD_SIZE } from "@/features/pool/providers";

/** One subject, drawn by every arm, so the rows differ by encoder not by prompt length. */
const SUBJECT = "A red panda curled on a mossy branch";
const PROMPT = `${SUBJECT}, ${ART_STYLE}`;

const PROD = "https://kids-collection.vercel.app";

/**
 * Every width the app can ask for, and no others — see the header. A width
 * outside `next.config.ts`'s allowlist is refused by the optimizer, so this
 * doubles as a check that the allowlist and `CardImage`'s dims still agree.
 */
const WIDTHS = [128, 256, 512, 1080];

const SDXL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
const LIGHTNING = "@cf/bytedance/stable-diffusion-xl-lightning";

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

async function cloudflare(
  model: string,
  extraBody: Record<string, unknown> = {},
  extraHeaders: Record<string, string> = {},
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN ?? ""}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      prompt: PROMPT,
      width: CARD_SIZE.width,
      height: CARD_SIZE.height,
      num_steps: 20,
      guidance: 7.5,
      seed: 42,
      ...extraBody,
    }),
  });
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "(none)",
  };
}

async function pollinations(): Promise<Uint8Array> {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(PROMPT)}` +
    `?width=${CARD_SIZE.width}&height=${CARD_SIZE.height}&model=flux&seed=42&nologo=true`;
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * What the SNIFFED format is, against what the response CLAIMED. `-lightning`
 * returns JPEG under an `image/png` content type, which is the whole reason the
 * seam reads bytes rather than headers.
 */
function describeFormat(bytes: Uint8Array, contentType: string): string {
  const sniffed = readImageSize(bytes);
  const actual = sniffed ? sniffed.format : "UNRECOGNISED";
  return contentType.includes(actual) ? actual : `${actual} (header said ${contentType})`;
}

async function delivered(): Promise<void> {
  const arms: Array<{ name: string; bytes: Uint8Array; ext: string; type: string }> = [];

  const sdxl = await cloudflare(SDXL);
  arms.push({ name: "cloudflare-sdxl", bytes: sdxl.bytes, ext: "png", type: "image/png" });
  const light = await cloudflare(LIGHTNING);
  arms.push({ name: "cloudflare-lightning", bytes: light.bytes, ext: "jpg", type: "image/jpeg" });
  arms.push({ name: "pollinations", bytes: await pollinations(), ext: "jpg", type: "image/jpeg" });

  const uploaded: string[] = [];
  try {
    console.log(`\n${"arm".padEnd(22)}${"source".padStart(10)}   ${WIDTHS.map((w) => `w=${w}`.padStart(9)).join("")}`);
    for (const arm of arms) {
      // `probe-79/`, never `cards/`: a probe that outlives a crashed run must not
      // look like an orphaned card to `--blob-budget`.
      const { url } = await put(`probe-79/${arm.name}.${arm.ext}`, Buffer.from(arm.bytes), {
        access: "public",
        contentType: arm.type,
      });
      uploaded.push(url);

      const row: string[] = [];
      for (const w of WIDTHS) {
        const res = await fetch(`${PROD}/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`, {
          headers: { Accept: "image/webp,image/*" },
        });
        // A width outside next.config.ts's allowlist answers 400, which is a
        // finding about the config rather than about the image.
        const cell = res.ok ? kb((await res.arrayBuffer()).byteLength) : `HTTP ${res.status}`;
        row.push(cell.padStart(9));
      }
      console.log(`${arm.name.padEnd(22)}${kb(arm.bytes.byteLength).padStart(10)}   ${row.join("")}`);
    }
  } finally {
    // In a finally, because the probes are the only thing this writes and a
    // half-finished run must not leave them behind charging the allowance.
    for (const url of uploaded) await del(url);
    console.log(`\ndeleted ${uploaded.length} probe object(s) from Blob`);
  }
}

async function steer(): Promise<void> {
  const arms: Array<[string, () => Promise<{ bytes: Uint8Array; contentType: string }>]> = [
    ["sdxl, as shipped", () => cloudflare(SDXL)],
    ["sdxl + Accept: image/jpeg", () => cloudflare(SDXL, {}, { Accept: "image/jpeg" })],
    ["sdxl + response_format", () => cloudflare(SDXL, { response_format: "jpeg" })],
    ["stable-diffusion-xl-lightning", () => cloudflare(LIGHTNING)],
  ];
  console.log(`\n${"arm".padEnd(32)}${"bytes".padStart(10)}  format`);
  for (const [label, run] of arms) {
    const { bytes, contentType } = await run();
    console.log(
      `${label.padEnd(32)}${kb(bytes.byteLength).padStart(10)}  ${describeFormat(bytes, contentType)}`,
    );
  }
  console.log(
    `\nThe three sdxl rows differ only by this lane's ordinary non-determinism\n` +
      `(#66) — an unknown key is DROPPED, not refused, so an invented parameter\n` +
      `returns 200 and looks like it worked.`,
  );
}

const mode = process.argv.includes("--steer") ? "steer" : "delivered";
await (mode === "steer" ? steer() : delivered());
