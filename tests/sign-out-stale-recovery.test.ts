import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { NOTICE_MS, RELOAD_GUARD_KEY } from "@/shared/stale-deploy/recovery";

const signOutAction = vi.fn<() => Promise<void>>();
vi.mock("@/features/profiles/actions", () => ({ signOutAction: () => signOutAction() }));
vi.mock("posthog-js", () => ({ default: { reset: vi.fn() } }));

// A stale page's Sign out must recover (notice + one reload), not throw uncaught.
describe("SignOutButton on a page that outlived a deploy", () => {
  const reload = vi.fn();
  const store = new Map<string, string>();

  beforeEach(() => {
    vi.useFakeTimers();
    // The test runner compiles the component's JSX with the classic runtime.
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
      location: { reload },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reloads once instead of leaving an uncaught UnrecognizedActionError", async () => {
    signOutAction.mockRejectedValue(
      new UnrecognizedActionError('Server Action "abc" was not found on the server.'),
    );
    const uncaught = vi.fn();
    process.on("unhandledRejection", uncaught);
    try {
      const { SignOutButton } = await import("@/features/auth/SignOutButton");
      const button = SignOutButton() as { props: { onClick: () => void } };
      button.props.onClick();
      await vi.advanceTimersByTimeAsync(NOTICE_MS);

      expect(signOutAction).toHaveBeenCalledTimes(1);
      expect(store.get(RELOAD_GUARD_KEY)).toBeDefined();
      expect(reload).toHaveBeenCalledTimes(1);
      expect(uncaught).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", uncaught);
    }
  });
});
