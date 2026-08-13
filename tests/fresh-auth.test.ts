import { describe, it, expect } from "vitest";
import { hasFreshAuth, FRESH_AUTH_WINDOW_MS } from "@/features/auth/fresh-auth";

/**
 * Enrolment is the one action that mints a lasting key to the admin gate, so a
 * live session is not enough — an unattended logged-in device would otherwise be
 * a permanent bypass.
 */
describe("hasFreshAuth", () => {
  const NOW = 1_700_000_000_000;
  const secondsAgo = (s: number) => Math.floor(NOW / 1000) - s;

  it("accepts an authentication inside the window", () => {
    expect(hasFreshAuth(secondsAgo(0), NOW)).toBe(true);
    expect(hasFreshAuth(secondsAgo(60), NOW)).toBe(true);
  });

  it("rejects one older than the window", () => {
    expect(hasFreshAuth(secondsAgo(FRESH_AUTH_WINDOW_MS / 1000 + 1), NOW)).toBe(false);
  });

  it("rejects a missing claim — sessions issued before authTime existed", () => {
    expect(hasFreshAuth(undefined, NOW)).toBe(false);
  });

  it("rejects a future-dated stamp rather than treating it as very fresh", () => {
    expect(hasFreshAuth(secondsAgo(-120), NOW)).toBe(false);
  });
});
