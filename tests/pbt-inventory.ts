import { posix } from "node:path";

/**
 * The property-based inventory is a glob, not a list (#132).
 *
 * Property-Based Testing is a blocking constraint, and the set of property tests
 * it is stated over is `tests/**\/*.pbt.test.ts`. That used to be restated as
 * hand-typed counts and a hand-typed module list in technical-environment.md and
 * ci.yml, which drifted on nearly every test commit and could never have caught
 * the failure that actually mattered: a property in a file named `foo.test.ts`
 * runs and passes under `pnpm test` while sitting outside the inventory (#110).
 *
 * So the rule is checked instead of the numbers. A property file — one that
 * imports fast-check and builds a property with it — is in the inventory when
 * it is either
 *
 *   - itself a `*.pbt.test.ts` under `tests/`, the only place `pnpm test` looks, or
 *   - a module that is not a test file — in practice a contract suite spec under
 *     `tests/contracts/` — imported by such a file, which is what makes its
 *     properties run as part of the inventory.
 *
 * Anything else is returned as misplaced. A property is recognised by its
 * constructor rather than by how it is run, so a named or renamed fast-check
 * import, or `check` in place of `assert`, is still found. Importing fast-check
 * without building a property (tests/setup.ts) is not a property file. A
 * commented-out property still counts, which errs loud rather than quiet, and so
 * does a contract imported by some route the import scan below does not follow.
 */

export type SourceFile = { path: string; source: string };

const IMPORTS_FAST_CHECK = /\bfrom\s*["']fast-check["']/;
const BUILDS_PROPERTY = /\b(?:property|asyncProperty)\s*\(/;
const RELATIVE_SPECIFIER = /\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g;

const isPropertyFile = (f: SourceFile) =>
  IMPORTS_FAST_CHECK.test(f.source) && BUILDS_PROPERTY.test(f.source);
const isInventoryTest = (path: string) => path.startsWith("tests/") && path.endsWith(".pbt.test.ts");
const isTest = (path: string) => /\.test\.tsx?$/.test(path);
const withoutExtension = (path: string) => path.replace(/\.tsx?$/, "");

export function misplacedProperties(files: SourceFile[]): string[] {
  const runByInventory = new Set(
    files
      .filter((f) => isInventoryTest(f.path))
      .flatMap((f) =>
        [...f.source.matchAll(RELATIVE_SPECIFIER)].map((m) =>
          withoutExtension(posix.join(posix.dirname(f.path), m[1])),
        ),
      ),
  );

  return files
    .filter(isPropertyFile)
    .filter((f) =>
      isTest(f.path) ? !isInventoryTest(f.path) : !runByInventory.has(withoutExtension(f.path)),
    )
    .map((f) => f.path);
}
