// SCRATCH — deliberately failing pg integration test. Proves the `test:pg`
// gate reports red (#23).
//
// It asserts against a REAL round trip (truncate, insert, read back) rather
// than `expect(1).toBe(2)`, so a red here also proves the containers actually
// came up and the neon HTTP proxy answered — a suite that could not reach the
// database would fail differently, with connection errors instead of a clean
// 1 !== 99 diff.
import { neon } from "@neondatabase/serverless";
import { describe, expect, it } from "vitest";
import { resetAll, seedChildren } from "./db";

const sql = neon(process.env.DATABASE_URL!);

describe("harness honesty (pg)", () => {
  it("fails on purpose after a real database round trip", async () => {
    await resetAll();
    await seedChildren({ c1: {} });
    const rows = await sql`SELECT count(*)::int AS n FROM children`;
    expect(rows[0].n).toBe(99); // really 1
  });
});
