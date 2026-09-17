import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { misplacedProperties } from "./pbt-inventory";

// Built by concatenation so this file's own fixtures are not themselves a call
// site the repo-wide sweep would find.
const CALL = "fc" + ".assert(";

describe("misplacedProperties (#132)", () => {
  it("flags a property in a test file not named *.pbt.test.ts", () => {
    expect(
      misplacedProperties([
        { path: "tests/trade-band-copy.test.ts", source: `${CALL}fc.property(...))` },
      ]),
    ).toEqual(["tests/trade-band-copy.test.ts"]);
  });

  it("accepts a property in a *.pbt.test.ts, and a file with no property at all", () => {
    expect(
      misplacedProperties([
        { path: "tests/sacrifice.pbt.test.ts", source: `${CALL}fc.property(...))` },
        { path: "tests/rarity.test.ts", source: `expect(1).toBe(1)` },
      ]),
    ).toEqual([]);
  });

  it("does not count a mention of the call in prose as a property", () => {
    expect(
      misplacedProperties([
        { path: "tests-pg/setup.ts", source: "// nothing here reaches `fc.assert`" },
      ]),
    ).toEqual([]);
  });

  describe("a shared contract carrying properties", () => {
    const contract = {
      path: "tests/contracts/child-store-contract.ts",
      source: `export function runChildStoreContract() { ${CALL}fc.asyncProperty(...)) }`,
    };
    const entry = (path: string) => ({
      path,
      source: `import { runChildStoreContract } from "./contracts/child-store-contract";`,
    });

    it("is in the inventory when a *.pbt.test.ts runs it", () => {
      expect(misplacedProperties([contract, entry("tests/child-store.pbt.test.ts")])).toEqual([]);
    });

    it("is flagged when only plain test files run it", () => {
      expect(
        misplacedProperties([
          contract,
          entry("tests/child-store.test.ts"),
          { path: "tests-pg/child-store.pg.test.ts", source: `from "../tests/contracts/child-store-contract";` },
        ]),
      ).toEqual(["tests/contracts/child-store-contract.ts"]);
    });
  });
});

describe("the repo's property tests (#132)", () => {
  const ROOT = resolve(__dirname, "..");
  const SUITES = ["tests", "tests-pg", "tests-live"];

  function listFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return listFiles(full);
      return /\.tsx?$/.test(full) ? [full] : [];
    });
  }

  it("all sit in the *.pbt.test.ts inventory", () => {
    const files = SUITES.flatMap((s) => listFiles(join(ROOT, s))).map((full) => ({
      path: relative(ROOT, full).split(sep).join("/"),
      source: readFileSync(full, "utf8"),
    }));
    // A sweep that found nothing would pass by finding nothing to object to.
    expect(files.filter((f) => f.path.endsWith(".pbt.test.ts")).length).toBeGreaterThan(0);

    expect(misplacedProperties(files)).toEqual([]);
  });
});
