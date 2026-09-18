import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/**
 * Play-facing binder must never import admin (kc-binder layering follow-up).
 *
 * `src/features/binder` renders under `app/play`; `src/features/admin` is the
 * parent-gated surface. Admin composes binder's shared pieces (rarity-slot,
 * RarityThumb) itself — that direction is fine — but binder reaching back into
 * admin puts admin-only UI behind a play import and inverts the boundary. This
 * mirrors `provider-boundary.test.ts`'s crawl so the rule is a property of the
 * code, not just a fact about today's call sites.
 */

const ROOT = resolve(__dirname, "..");
const FORBIDDEN = join(ROOT, "src", "features", "admin");
const ENTRY_DIR = join(ROOT, "src", "features", "binder");
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

describe("binder → admin layering", () => {
  it("nothing under src/features/binder imports src/features/admin", () => {
    const queue = listFiles(ENTRY_DIR);
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
        // Only crawl inside binder itself — admin depending on binder (the
        // other direction) is allowed and out of scope for this rule, so
        // don't follow edges that leave src/features/binder.
        if (target.startsWith(ENTRY_DIR) && !seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
