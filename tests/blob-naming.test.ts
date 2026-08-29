import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { uploadImage } from "@/features/pool/image";
import { solidPng } from "@/features/pool/providers/fake";

/**
 * What a published card is actually NAMED (#102).
 *
 * `uploadImage` had no test at all: the only thing that had ever exercised the
 * upload seam was a real seed run against the real store. That mattered because
 * the pathname the code asks for is NOT the object's name:
 *
 *   put(`cards/${key}.jpg`, …)      ← what the code says
 *   cards/<key>-<random>.jpg        ← what the store creates
 *
 * The difference is an `addRandomSuffix` default of `true` that this call never
 * states, and `cards.imageUrl` holds the SUFFIXED URL — so that default decides
 * where ~390 cards live. `@vercel/blob@1.0` flips it to `false`, and a
 * Dependabot *security* PR can be what makes the flip (#91 records 12 open
 * `undici` advisories reachable only through 0.27.3, and security updates bypass
 * the majors rule by design): a change to production storage layout arriving
 * through a green build. This test is the gate that reddens instead.
 *
 * ── What actually flips, and why a spy on `put()` cannot see it ────────────
 * Not the arguments: `put("cards/x.jpg", bytes, {access, contentType})` is
 * character-for-character the same call before and after. Not the naming headers
 * either — v1.0.0's `createPutHeaders` is structurally identical to 0.27's and
 * still sends `x-add-random-suffix` ONLY when the caller passes the option,
 * which this code never does. Both versions ask the service to decide.
 *
 * What changes is WHICH default the service applies, and that is selected by a
 * number the client library owns and the calling code never sees:
 *
 *   `x-api-version: 9`   (0.27.3)  → the service adds a random suffix
 *   `x-api-version: 10`  (1.0.0)   → the service takes the pathname literally
 *
 * `BLOB_API_VERSION` is a constant inside the package — `9` in 0.27.3, `10` in
 * 1.0.0, and `12` by 2.8.0 (checked 2026-08-29), so nothing this package has
 * shipped since 0.27 sends a 9. Verified the way it should be: the gate below
 * was run against a real 1.0.0 build dropped into `node_modules`, and it
 * reddened with `expected '10' to be '9'`.
 *
 * So the whole flip happens between `put` and the wire, where a fake `put` sees
 * nothing at all: a spy records identical arguments on both versions and passes.
 * That is why
 * the boundary faked here is the TRANSPORT, with the real `@vercel/blob` on top
 * of it — the api version is the only trace the change leaves locally, and only
 * the real client emits it.
 *
 * The interception is a loopback HTTP server plus `VERCEL_BLOB_API_URL`, the
 * client's own API-base override, rather than a module mock. Mocking the
 * transport module was tried first and is a trap: under pnpm the test's `undici`
 * and the copy `@vercel/blob` imports are different module instances, so
 * `vi.mock("undici", …)` collected and ran green while the real client quietly
 * made a REAL request to blob.vercel-storage.com — the exact thing this test
 * promises not to do, hidden behind a passing mock. A socket on 127.0.0.1
 * cannot be wrong about which client is talking to it. Nothing leaves the
 * machine, no store is touched, and the token below is not a credential. A
 * version that stopped honouring the override would reach the real API before
 * failing, which is worth knowing: the override is read lazily in `getApiUrl()`
 * on every call, so it holds for as long as the stub does.
 *
 * ── What this test cannot pin ────────────────────────────────────────────────
 * The service side of that table. Which default api version 9 and api version 10
 * each select lives on Vercel's machines, unobservable offline; the loopback fake
 * below MODELS it. The evidence for the version-9 row is the store itself:
 * `--blob-budget` counted **403 objects against 390 cards, 1.07 MB stranded**
 * (2026-08-15, `blob-budget.ts`) — re-publishing a card wrote a new object rather
 * than overwriting one, which only happens if the suffix is real. The version-10
 * row is `@vercel/blob@1.0.0`'s release note, not something measured here.
 *
 * Nor does this decide anything. Whether the pool SHOULD be on
 * `addRandomSuffix: false` + `allowOverwrite: true`, and what happens to the
 * ~390 existing `cards.imageUrl` values, is #91's call. The assertions here are
 * written so that making that decision reddens this file: that is the point —
 * the change becomes visible rather than silent.
 */

/** One captured request to the Blob API. */
interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
}

const captured: Captured[] = [];

let server: Server;

/** Where the fake serves its objects from — the shape, not a real store. */
const STORE = "https://teststore.public.blob.vercel-storage.com";

/** One card, used throughout so the asserted names are comparable. */
const KEY = "flying-machines-concorde";

beforeAll(async () => {
  /**
   * The Blob API, modelled to the extent the naming property needs: it records
   * the request and names the object the way the service would.
   *
   * A stated `x-add-random-suffix` wins. With none stated — which is every
   * request this repo makes — the api version decides, which is the mechanism
   * the whole file is about: 9 suffixes, 10 takes the pathname literally.
   */
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://blob.test");
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      headers[k.toLowerCase()] = String(v);
    }
    captured.push({ url: url.toString(), method: req.method ?? "", headers });

    const asked = url.searchParams.get("pathname") ?? "";
    const stated = headers["x-add-random-suffix"];
    const suffixed =
      stated !== undefined ? stated === "1" : Number(headers["x-api-version"]) <= 9;
    const pathname = suffixed ? asked.replace(/(\.[^.]+)$/, "-r4nd0m$1") : asked;
    const body = JSON.stringify({
      url: `${STORE}/${pathname}`,
      downloadUrl: `${STORE}/${pathname}?download=1`,
      pathname,
      contentType: headers["x-content-type"] ?? "application/octet-stream",
      contentDisposition: `inline; filename="${pathname}"`,
    });

    // Drain before replying: the client streams the bytes, and answering an
    // unread request body is how this would deadlock on a larger card.
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
});

afterAll(async () => {
  await new Promise<void>((ok, fail) =>
    server.close((e?: Error) => (e ? fail(e) : ok())),
  );
});

/** A minimal well-formed 768x768 JPEG, header only — `readImageSize` reads no further. */
function jpeg(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    0x03, 0x00, // height 768
    0x03, 0x00, // width 768
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);
}

/** The `pathname` query parameter — what the code ASKED the object be called. */
function askedPathname(req: Captured): string {
  return new URL(req.url).searchParams.get("pathname") ?? "";
}

beforeEach(() => {
  captured.length = 0;
  const { port } = server.address() as AddressInfo;
  vi.stubEnv("VERCEL_BLOB_API_URL", `http://127.0.0.1:${port}`);
  // Not a credential. `requestApi` only reads the third `_`-separated field as a
  // request-id prefix, and the store this names does not exist anywhere.
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_TESTSTORE_notarealtoken");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("uploadImage — the pathname it asks for", () => {
  it("asks for cards/<blobKey>.jpg, with no suffix of its own", async () => {
    await uploadImage(KEY, jpeg());
    expect(captured).toHaveLength(1);
    expect(captured[0].method).toBe("PUT");
    expect(askedPathname(captured[0])).toBe(`cards/${KEY}.jpg`);
  });

  it("keeps the .jpg pathname whatever the bytes are, and sends the sniffed type", async () => {
    // Not a format claim: `.jpg` is the name ~360 already-published objects
    // carry. The browser honours the content type, which is sniffed from the
    // bytes, so a PNG card is served as image/png from a .jpg pathname.
    await uploadImage("outer-space-nebula", solidPng(768, 768));
    expect(captured).toHaveLength(1);
    expect(askedPathname(captured[0])).toBe("cards/outer-space-nebula.jpg");
    expect(captured[0].headers["x-content-type"]).toBe("image/png");
  });

  it("publishes nothing when the bytes are not a recognisable image", async () => {
    await expect(uploadImage("junk", new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(
      /not a recognisable/,
    );
    expect(captured).toEqual([]);
  });
});

describe("the naming default this pool silently depends on (#102 gate)", () => {
  it("asks the service for api version 9 — the version whose default suffixes", async () => {
    // ⚠️ THE GATE. This is the assertion a `@vercel/blob` v1 bump breaks, and it
    // is the ONLY local trace that bump leaves: the arguments to `put` and the
    // headers below are identical on both versions, so nothing else in a diff or
    // a spy would show that where cards are published had changed.
    //
    // Pinning a version number rather than a behaviour is deliberate and is the
    // honest thing to assert: the behaviour is the service's, and this number is
    // how the client selects it. Read it as "the naming contract this pool was
    // built against", not as "0.27 is the right version to be on".
    //
    // It is a proxy, and the gap is worth stating: the api version moves for
    // reasons other than naming too — 8 → 9 happened inside the 0.27 line
    // (0.27.0/0.27.1 sent 8, 0.27.2 sent 9) and 10 → 11 inside 1.0.x. So a red
    // means "the client's naming contract moved and nobody looked", not "naming
    // definitely changed". Fail-closed is the right direction for a property
    // whose other half is only observable in production. It also cannot fire by
    // accident on a patch: 0.27.3 is the last release of that line, so nothing
    // satisfying `^0.27.3` sends anything but 9.
    //
    // A red here is a decision point, never a thing to re-baseline: the upgrade
    // is #91's, along with `addRandomSuffix`/`allowOverwrite` and the ~390
    // `cards.imageUrl` values already written under version 9's default.
    await uploadImage(KEY, jpeg());
    expect(captured).toHaveLength(1);
    expect(captured[0].headers["x-api-version"]).toBe("9");
  });

  it("states no naming or overwrite policy of its own — which is what makes the version decide", async () => {
    // Vacuous on 0.27 by itself: `putOptionHeaderMap` has no `allowOverwrite`
    // entry at all, and `x-add-random-suffix` is only sent when a caller passes
    // the option. It is here for what it says about the call ABOVE — the request
    // delegates naming entirely, so the api version is not one input among
    // several, it is the whole decision. It also catches the deliberate change:
    // once #91 states a policy, this fails and the pin above stops being the
    // thing that guards naming.
    await uploadImage(KEY, jpeg());
    const policyHeaders = Object.keys(captured[0].headers).filter((h) =>
      /^x-(add-random-suffix|allow-overwrite)$/.test(h),
    );
    expect(policyHeaders).toEqual([]);
  });

  it("returns the SUFFIXED url the service replies with — that is what cards.imageUrl holds", async () => {
    // The hazard in one assertion: the code names the object `cards/<key>.jpg`,
    // the row records something else, and nothing in the tree said so before this
    // test. It is also why `--blob-budget` reads the store rather than the pool's
    // URLs — a re-publish strands the previous object.
    const url = await uploadImage(KEY, jpeg());
    expect(url).toBe(`${STORE}/cards/${KEY}-r4nd0m.jpg`);
  });

  it("publishes to a DIFFERENT name under api version 10, with the call unchanged", async () => {
    // The counterfactual, and the reason the pin above is worth having. Nothing
    // here changes: same `uploadImage`, same pathname, same options, same absent
    // headers. Only the version number moves — forced with the client's own
    // `VERCEL_BLOB_API_VERSION_OVERRIDE` rather than by installing v1 — and the
    // published object is renamed underneath the pool.
    //
    // So a bump does not merely risk re-pointing where cards are published; this
    // is it happening, with `cards.imageUrl` values from before the bump still
    // pointing at suffixed objects and every new one named differently. That
    // migration is #91's; making it impossible to ship unnoticed is this file's.
    vi.stubEnv("VERCEL_BLOB_API_VERSION_OVERRIDE", "10");
    const url = await uploadImage(KEY, jpeg());
    expect(captured[0].headers["x-api-version"]).toBe("10");
    expect(askedPathname(captured[0])).toBe(`cards/${KEY}.jpg`);
    expect(url).toBe(`${STORE}/cards/${KEY}.jpg`);
  });
});
