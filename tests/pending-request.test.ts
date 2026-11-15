import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  clearPendingPackRequestId,
  clearPendingRequestId,
  getOrCreatePackRequestId,
  getOrCreateRequestId,
  isPullRequestId,
  reloadStuckPull,
} from "@/features/pull/pending-request";

/** #kcpi — the pull request id survives a reload until its outcome is shown. */

let store: Map<string, string>;
let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  store = new Map();
  reload = vi.fn();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    location: { reload },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("pending pull request id", () => {
  it("the stuck panel's retry reloads, and the reloaded page's tap reuses the same id", () => {
    const first = getOrCreateRequestId("kid");

    reloadStuckPull();

    expect(reload).toHaveBeenCalledOnce();
    expect(getOrCreateRequestId("kid")).toBe(first);
  });

  it("mints a fresh id once the outcome has been shown, isolated per child", () => {
    const first = getOrCreateRequestId("kid");
    expect(getOrCreateRequestId("other")).not.toBe(first);

    clearPendingRequestId("kid");

    expect(getOrCreateRequestId("kid")).not.toBe(first);
  });

  it("still mints a usable id when sessionStorage is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(isPullRequestId(getOrCreateRequestId("kid"))).toBe(true);
  });
});

describe("pending pack request id (#kcmassdraw)", () => {
  it("is namespaced apart from the single-pull id — neither reuses the other's pending id", () => {
    const single = getOrCreateRequestId("kid");
    const pack = getOrCreatePackRequestId("kid");

    expect(pack).not.toBe(single);
    // A reload-style re-read of either still returns its OWN pending id, not
    // the other's — a stuck single pull must never resolve a pack tap's claim.
    expect(getOrCreateRequestId("kid")).toBe(single);
    expect(getOrCreatePackRequestId("kid")).toBe(pack);
  });

  it("mints a fresh pack id once that pack's outcome has been shown, isolated per child", () => {
    const first = getOrCreatePackRequestId("kid");
    expect(getOrCreatePackRequestId("other")).not.toBe(first);

    clearPendingPackRequestId("kid");

    expect(getOrCreatePackRequestId("kid")).not.toBe(first);
  });

  it("clearing the pack id leaves a pending single-pull id untouched, and vice versa", () => {
    const single = getOrCreateRequestId("kid");
    getOrCreatePackRequestId("kid");

    clearPendingPackRequestId("kid");

    expect(getOrCreateRequestId("kid")).toBe(single); // untouched by the pack clear
  });
});

describe("isPullRequestId", () => {
  it("accepts minted ids and rejects what a pre-#kcpi client would send", () => {
    expect(isPullRequestId(`pull_${crypto.randomUUID()}`)).toBe(true);
    // A bare UUID is exactly what a theme id looks like — what an old bundle sends here.
    const themeId = crypto.randomUUID();
    for (const v of [undefined, null, "", "dinosaurs", "t1", themeId, 42, {}]) {
      expect(isPullRequestId(v)).toBe(false);
    }
  });
});
