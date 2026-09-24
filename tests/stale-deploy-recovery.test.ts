import { describe, expect, it, vi } from "vitest";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import {
  NOTICE_MS,
  RELOAD_GUARD_KEY,
  RELOAD_GUARD_MS,
  createStaleRecovery,
  isStaleDeploymentError,
} from "@/shared/stale-deploy/recovery";

const stale = () => new UnrecognizedActionError('Server Action "abc" was not found on the server.');

/** A sessionStorage stand-in that outlives the "page", like the real one across a reload. */
function makeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

/** One page load: fresh module state (`reloading`), shared storage and clock. */
function pageLoad(storage: ReturnType<typeof makeStorage>, clock: { t: number }) {
  const reload = vi.fn();
  const scheduled: Array<{ fn: () => void; ms: number }> = [];
  const recovery = createStaleRecovery({
    storage: () => storage,
    reload,
    now: () => clock.t,
    schedule: (fn, ms) => void scheduled.push({ fn, ms }),
  });
  return { recovery, reload, scheduled };
}

describe("isStaleDeploymentError", () => {
  it("recognises Next's UnrecognizedActionError", () => {
    expect(isStaleDeploymentError(stale())).toBe(true);
  });

  it("does not mistake genuine failures for a stale page", () => {
    expect(isStaleDeploymentError(new Error("boom"))).toBe(false);
    // What a genuine production action failure looks like on the client.
    const redacted = Object.assign(new Error("An error occurred in the Server Components render."), { digest: "3152391643" });
    expect(isStaleDeploymentError(redacted)).toBe(false);
    // Same name and message but not Next's class: not trusted.
    const lookalike = Object.assign(new Error('Server Action "abc" was not found on the server.'), { name: "UnrecognizedActionError" });
    expect(isStaleDeploymentError(lookalike)).toBe(false);
    for (const v of [null, undefined, "UnrecognizedActionError", 42, {}]) {
      expect(isStaleDeploymentError(v)).toBe(false);
    }
  });

  it("treats everything as genuine if Next's detector is ever removed", async () => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({}));
    const mod = await import("@/shared/stale-deploy/recovery");
    expect(mod.isStaleDeploymentError(stale())).toBe(false);
    vi.doUnmock("next/navigation");
    vi.resetModules();
  });

  it("treats everything as genuine if Next's detector throws", async () => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({
      unstable_isUnrecognizedActionError: () => {
        throw new Error("changed");
      },
    }));
    const mod = await import("@/shared/stale-deploy/recovery");
    expect(mod.isStaleDeploymentError(stale())).toBe(false);
    vi.doUnmock("next/navigation");
    vi.resetModules();
  });
});

describe("createStaleRecovery", () => {
  it("announces, then reloads once after the notice delay", () => {
    const { recovery, reload, scheduled } = pageLoad(makeStorage(), { t: 1_000 });
    const listener = vi.fn();
    recovery.subscribe(listener);

    expect(recovery.recover(stale())).toBe(true);
    expect(recovery.isReloading()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].ms).toBe(NOTICE_MS);

    scheduled[0].fn();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("leaves a genuine failure alone: no notice, no reload, no guard written", () => {
    const storage = makeStorage();
    const { recovery, reload, scheduled } = pageLoad(storage, { t: 1_000 });

    expect(recovery.recover(new Error("genuine"))).toBe(false);
    expect(recovery.isReloading()).toBe(false);
    expect(scheduled).toHaveLength(0);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.getItem(RELOAD_GUARD_KEY)).toBeNull();
  });

  it("is idempotent while a reload is pending (effects that run twice)", () => {
    const { recovery, scheduled } = pageLoad(makeStorage(), { t: 1_000 });
    expect(recovery.recover(stale())).toBe(true);
    expect(recovery.recover(stale())).toBe(true);
    expect(scheduled).toHaveLength(1);
  });

  it("does not loop: a second stale failure after the reload surfaces", () => {
    const storage = makeStorage();
    const clock = { t: 1_000 };

    const first = pageLoad(storage, clock);
    expect(first.recovery.recover(stale())).toBe(true);
    first.scheduled[0].fn();

    // The page reloaded (fresh module state) and is *still* stale.
    clock.t += 3_000;
    const second = pageLoad(storage, clock);
    expect(second.recovery.recover(stale())).toBe(false);
    expect(second.recovery.isReloading()).toBe(false);
    expect(second.scheduled).toHaveLength(0);
    expect(second.reload).not.toHaveBeenCalled();
  });

  it("recovers again for a later, unrelated deploy in the same tab", () => {
    const storage = makeStorage();
    const clock = { t: 1_000 };
    pageLoad(storage, clock).recovery.recover(stale());

    clock.t += RELOAD_GUARD_MS;
    const later = pageLoad(storage, clock);
    expect(later.recovery.recover(stale())).toBe(true);
  });

  it("does not reload when the guard cannot be recorded", () => {
    const reload = vi.fn();
    const scheduled: Array<() => void> = [];
    for (const storage of [
      () => {
        throw new Error("storage blocked");
      },
      () => ({
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ]) {
      const recovery = createStaleRecovery({
        storage,
        reload,
        now: () => 1_000,
        schedule: (fn) => void scheduled.push(fn),
      });
      expect(recovery.recover(stale())).toBe(false);
    }
    expect(scheduled).toHaveLength(0);
    expect(reload).not.toHaveBeenCalled();
  });
});
