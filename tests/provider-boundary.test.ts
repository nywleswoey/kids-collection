import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, listFiles, specifiersIn, resolveSpecifier, crawlImports } from "./module-graph";

/**
 * Image generation must never be reachable from the request path (#67).
 *
 * The seed CLI is offline-only, so provider keys live in `.env.local` and are
 * never set in Vercel env in any environment. Before this ticket that was a fact
 * about call sites — `generateImage` had exactly one non-test importer — rather
 * than a property of the code. Three adapters each reading a secret makes it
 * worth converting into a red build.
 *
 * All seed-only code lives in `src/seed/` (the providers and every other
 * offline pool module), still under `src/` so it shares the `@/*` alias and the
 * unit-test layout. This test is what pays for that choice: nothing reachable
 * from the request path may import ANY of it, not just a provider.
 */

const FORBIDDEN = join(ROOT, "src", "seed");
const ENTRY_DIRS = ["app"];
const ENTRY_FILES = ["middleware.ts", "instrumentation-client.ts", "next.config.ts"];

describe("provider boundary (#67)", () => {
  it("nothing reachable from the request path imports src/seed", () => {
    const entries = [
      ...ENTRY_DIRS.flatMap((d) => listFiles(join(ROOT, d))),
      ...ENTRY_FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
    ];
    expect(entries.length).toBeGreaterThan(0); // a silent empty sweep proves nothing

    const { offenders } = crawlImports(entries, FORBIDDEN);

    expect(offenders).toEqual([]);
  });

  it("the sweep actually reaches the pool code, so a pass is not vacuous", () => {
    // Without this, deleting the crawl would still make the test above green.
    const appFiles = listFiles(join(ROOT, "app"));
    const reachable = appFiles.flatMap((f) =>
      specifiersIn(f)
        .map((s) => resolveSpecifier(f, s))
        .filter((t): t is string => t !== null),
    );
    expect(reachable.some((t) => t.includes(join("src", "shared", "pool")))).toBe(true);
  });
});
