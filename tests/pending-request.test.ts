import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  clearPendingRequestId,
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

describe("isPullRequestId", () => {
  it("accepts minted ids and rejects what a pre-#kcpi client would send", () => {
    expect(isPullRequestId(crypto.randomUUID())).toBe(true);
    for (const v of [undefined, null, "", "dinosaurs", "t1", 42, {}]) {
      expect(isPullRequestId(v)).toBe(false);
    }
  });
});
