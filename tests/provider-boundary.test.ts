import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/**
 * Image generation must never be reachable from the request path (#67).
 *
 * The seed CLI is offline-only, so provider keys live in `.env.local` and are
 * never set in Vercel env in any environment. Before this ticket that was a fact
 * about call sites — `generateImage` had exactly one non-test importer — rather
 * than a property of the code. Three adapters each reading a secret makes it
 * worth converting into a red build.
 *
 * `src/features/pool/providers/` is deliberately placed under `src/`, following
 * the convention `writer.ts` and `url-check.ts` already set: seed-only pool code
 * lives with the rest of the pool code. This test is what pays for that choice.
 */

const ROOT = resolve(__dirname, "..");
const FORBIDDEN = join(ROOT, "src", "features", "pool", "providers");
const ENTRY_DIRS = ["app"];
const ENTRY_FILES = ["middleware.ts", "instrumentation-client.ts", "next.config.ts"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (EXTENSIONS.some((e) => full.endsWith(e))) out.push(full);
  }
  return out;
}

/** Every static import/export specifier and dynamic `import("…")` in a file. */
function specifiersIn(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const out: string[] = [];
  const patterns = [
    /(?:^|\n)\s*(?:import|export)[\s\S]{0,400}?from\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) out.push(m[1]);
  }
  return out;
}

/** Resolve a specifier the way the `@` alias and Node module resolution would. */
function resolveSpecifier(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null; // a package, not our code

  const candidates = [
    base,
    ...EXTENSIONS.map((e) => base + e),
    ...EXTENSIONS.map((e) => join(base, `index${e}`)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

describe("provider boundary (#67)", () => {
  it("nothing reachable from the request path imports an image provider", () => {
    const queue = [
      ...ENTRY_DIRS.flatMap((d) => listFiles(join(ROOT, d))),
      ...ENTRY_FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
    ];
    expect(queue.length).toBeGreaterThan(0); // a silent empty sweep proves nothing

    const seen = new Set<string>(queue);
    const offenders: string[] = [];

    while (queue.length > 0) {
      const file = queue.shift()!;
      for (const spec of specifiersIn(file)) {
        const target = resolveSpecifier(file, spec);
        if (!target) continue;
        if (target.startsWith(FORBIDDEN)) {
          offenders.push(`${file.slice(ROOT.length + 1)} → ${spec}`);
          continue;
        }
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }

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
    expect(reachable.some((t) => t.includes(join("src", "features")))).toBe(true);
  });
});
