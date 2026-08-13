import { describe, it, expect, afterEach } from "vitest";
import { env } from "@/lib/env";

/**
 * Regression: `.env.example` ships `WEBAUTHN_RP_ID=""`, so the variable is
 * routinely present-but-empty. With `??` the empty string survives, and an empty
 * rpID matches no host — passkeys would disable silently, with no error anywhere
 * to explain why the unlock page lost its button.
 */
describe("env.webauthnRpId", () => {
  const original = process.env.WEBAUTHN_RP_ID;

  afterEach(() => {
    if (original === undefined) delete process.env.WEBAUTHN_RP_ID;
    else process.env.WEBAUTHN_RP_ID = original;
  });

  it("defaults to localhost when unset", () => {
    delete process.env.WEBAUTHN_RP_ID;
    expect(env.webauthnRpId).toBe("localhost");
  });

  it("defaults to localhost when present but empty", () => {
    process.env.WEBAUTHN_RP_ID = "";
    expect(env.webauthnRpId).toBe("localhost");
  });

  it("uses the configured host when set", () => {
    process.env.WEBAUTHN_RP_ID = "kids-collection.vercel.app";
    expect(env.webauthnRpId).toBe("kids-collection.vercel.app");
  });
});
