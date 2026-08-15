import { describe, it, expect } from "vitest";
import { auditPublishedImages } from "@/features/pool/blank-audit";

const CARD = { width: 768, height: 768 };

/** A HEAD response the way Blob answers one: no body, a content-length. */
function head(byteLength: number): Response {
  return new Response(null, {
    status: 200,
    headers: { "content-length": String(byteLength) },
  });
}

const images = [{ theme: "Warriors", card: "Swiss Guard", url: "https://blob.example/a.png" }];

describe("published blank-frame audit (#78)", () => {
  it("reports a published card whose image is too sparse to be a picture", async () => {
    const report = await auditPublishedImages(images, {
      size: CARD,
      fetchImpl: async () => head(1_800), // the blank Cloudflare returned
    });
    expect(report.checked).toBe(1);
    expect(report.suspects).toHaveLength(1);
    expect(report.suspects[0]).toMatchObject({ card: "Swiss Guard", byteLength: 1_800 });
    expect(report.unreadable).toEqual([]);
  });

  it("leaves an ordinary card alone", async () => {
    // 70 KB — a measured Pollinations card at 768x768.
    const report = await auditPublishedImages(images, {
      size: CARD,
      fetchImpl: async () => head(70_139),
    });
    expect(report.suspects).toEqual([]);
  });

  it("reports an image it could not weigh as unreadable, never as blank", async () => {
    // `url-check.ts` learned this the hard way: a checker that cries wolf is
    // worse than no checker, because the operator's response to a reported blank
    // is to delete and republish a card that was fine.
    const report = await auditPublishedImages(images, {
      size: CARD,
      fetchImpl: async () => new Response(null, { status: 403 }),
    });
    expect(report.suspects).toEqual([]);
    expect(report.unreadable).toHaveLength(1);
    expect(report.unreadable[0].reason).toMatch(/403/);
  });

  it("falls back to the body when the host refuses HEAD, rather than giving up", async () => {
    // A CDN answering 405 to HEAD would otherwise put the ENTIRE pool into
    // `unreadable` and print "0 suspects" beside it — an all-clear earned by not
    // looking, which is the failure mode this whole issue is about.
    const report = await auditPublishedImages(images, {
      size: CARD,
      fetchImpl: async (_url, init) =>
        init?.method === "HEAD"
          ? new Response(null, { status: 405 })
          : new Response(new Uint8Array(1_800) as unknown as BodyInit, { status: 200 }),
    });
    expect(report.unreadable).toEqual([]);
    expect(report.suspects).toHaveLength(1);
  });

  it("falls back to reading the body when the response carries no length", async () => {
    let gets = 0;
    const report = await auditPublishedImages(images, {
      size: CARD,
      fetchImpl: async (_url, init) => {
        if (init?.method === "HEAD") return new Response(null, { status: 200 });
        gets++;
        return new Response(new Uint8Array(1_800) as unknown as BodyInit, { status: 200 });
      },
    });
    expect(gets).toBe(1);
    expect(report.suspects).toHaveLength(1);
    expect(report.suspects[0].byteLength).toBe(1_800);
  });
});
