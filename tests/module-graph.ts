import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/**
 * One model of how this repo resolves an import, shared by the boundary tests.
 *
 * `provider-boundary.test.ts` (#67) and `binder-admin-boundary.test.ts` both ask
 * the same question of different corners of the graph: starting from these
 * files, is anything under this directory reachable? The `@/*` → `src/*` alias
 * from tsconfig.json, the extension list and the `index.*` fallback are one rule
 * about this repo, so they live here once: a second alias or a new extension
 * added to a private copy would silently resolve to `null` in the other test —
 * an edge skipped, and a green run over a forbidden import.
 */

export const ROOT = resolve(__dirname, "..");

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

/** Every source file under `dir`, recursively. Missing directory → no files. */
export function listFiles(dir: string): string[] {
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
export function specifiersIn(file: string): string[] {
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
export function resolveSpecifier(from: string, spec: string): string | null {
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

/**
 * Crawl the import graph forward from `entries`, transitively.
 *
 * `offenders` are the edges whose target sits under `forbidden`, reported as
 * `repo-relative-importer → specifier`; a forbidden file is never crawled
 * through, so every offender names a real importer. `reached` is every file the
 * crawl touched, which is what lets a caller prove its sweep was not vacuous.
 */
export function crawlImports(
  entries: string[],
  forbidden: string,
): { reached: string[]; offenders: string[] } {
  const queue = [...entries];
  const seen = new Set<string>(queue);
  const offenders: string[] = [];

  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const spec of specifiersIn(file)) {
      const target = resolveSpecifier(file, spec);
      if (!target) continue;
      if (target.startsWith(forbidden)) {
        offenders.push(`${file.slice(ROOT.length + 1)} → ${spec}`);
        continue;
      }
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }

  return { reached: [...seen], offenders };
}
