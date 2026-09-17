import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { misplacedProperties } from "./pbt-inventory";

// Built by concatenation so this file's own fixtures do not read as a fast-check
// import to the repo-wide sweep below, which would make this file a property file.
const IMPORT_FC = `import fc from "fast${"-"}check";`;

const propertyFile = (path: string, body = "fc.assert(fc.property(arb, (x) => true));") => ({
  path,
  source: `${IMPORT_FC}\n${body}`,
});

describe("misplacedProperties (#132)", () => {
  it("flags a property in a test file not named *.pbt.test.ts", () => {
    expect(misplacedProperties([propertyFile("tests/trade-band-copy.test.ts")])).toEqual([
      "tests/trade-band-copy.test.ts",
    ]);
  });

  it("accepts a property in a *.pbt.test.ts, and files that build no property", () => {
    expect(
      misplacedProperties([
        propertyFile("tests/sacrifice.pbt.test.ts"),
        { path: "tests/rarity.test.ts", source: `expect(1).toBe(1)` },
        propertyFile("tests/setup.ts", "fc.configureGlobal({ numRuns: 1000 });"),
        { path: "tests-pg/setup.ts", source: "// nothing here reaches `fc.assert(fc.property(...))`" },
      ]),
    ).toEqual([]);
  });

  it("finds a property however fast-check is imported or the property is run", () => {
    const named = { path: "tests/a.test.ts", source: `import { assert, property } from "fast${"-"}check";\nassert(property(arb, p));` };
    const aliased = { path: "tests/b.test.ts", source: `import f from "fast${"-"}check";\nf.assert(f.asyncProperty(arb, p));` };
    const checked = propertyFile("tests/c.test.ts", "fc.check(fc.property(arb, p));");
    expect(misplacedProperties([named, aliased, checked])).toEqual([
      "tests/a.test.ts",
      "tests/b.test.ts",
      "tests/c.test.ts",
    ]);
  });

  it("flags a *.pbt.test.ts outside tests/, where `pnpm test` never runs it", () => {
    expect(misplacedProperties([propertyFile("tests-pg/delete-path.pbt.test.ts")])).toEqual([
      "tests-pg/delete-path.pbt.test.ts",
    ]);
  });

  describe("a contract suite spec carrying properties", () => {
    const contract = propertyFile(
      "tests/contracts/child-store-contract.ts",
      "export function runChildStoreContract() { fc.assert(fc.asyncProperty(arb, p)); }",
    );
    const importer = (path: string, from = "./contracts/child-store-contract") => ({
      path,
      source: `import { runChildStoreContract } from "${from}";`,
    });

    it("is in the inventory when a *.pbt.test.ts under tests/ runs it", () => {
      expect(misplacedProperties([contract, importer("tests/child-store.pbt.test.ts")])).toEqual([]);
    });

    it("is flagged when only plain test files run it", () => {
      expect(
        misplacedProperties([
          contract,
          importer("tests/child-store.test.ts"),
          importer("tests-pg/child-store.pg.test.ts", "../tests/contracts/child-store-contract"),
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
