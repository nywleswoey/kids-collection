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
 * So the rule is checked instead of the numbers. A file calling `fc.assert` is
 * in the inventory when it is either
 *
 *   - itself a `*.pbt.test.ts`, or
 *   - a module that is not a test file — in practice a shared contract under
 *     `tests/contracts/` — imported by some `*.pbt.test.ts`, which is what makes
 *     its properties run as part of the inventory.
 *
 * Anything else is returned as misplaced. Matching is on the call — the name
 * followed by an open paren — so prose that merely names it is not a property;
 * a commented-out call still is, which errs loud rather than quiet.
 */

export type SourceFile = { path: string; source: string };

const PROPERTY_CALL = /\bfc\s*\.\s*assert\s*\(/;
const RELATIVE_SPECIFIER = /\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g;

const isPbtTest = (path: string) => path.endsWith(".pbt.test.ts");
const isTest = (path: string) => /\.test\.tsx?$/.test(path);
const withoutExtension = (path: string) => path.replace(/\.tsx?$/, "");

export function misplacedProperties(files: SourceFile[]): string[] {
  const runByPbt = new Set(
    files
      .filter((f) => isPbtTest(f.path))
      .flatMap((f) =>
        [...f.source.matchAll(RELATIVE_SPECIFIER)].map((m) =>
          withoutExtension(posix.join(posix.dirname(f.path), m[1])),
        ),
      ),
  );

  return files
    .filter((f) => PROPERTY_CALL.test(f.source))
    .filter((f) =>
      isTest(f.path) ? !isPbtTest(f.path) : !runByPbt.has(withoutExtension(f.path)),
    )
    .map((f) => f.path);
}
