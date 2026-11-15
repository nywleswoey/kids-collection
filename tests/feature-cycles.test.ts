import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { ROOT, listFiles, specifiersIn, resolveSpecifier } from "./module-graph";

/**
 * Features may depend on each other, but never in a circle.
 *
 * A cycle between two feature folders means neither can be read, tested or
 * changed on its own: `pull` ↔ `rewards` was the live example (pull called the
 * reward granter, rewards reached back for `pickUpgradeCard`) until the shared
 * sacrifice rules moved to `src/shared/rules/`. This test collapses the
 * file-level import graph to feature → feature edges and fails on any cycle,
 * naming it, so the next one is a red build rather than an archaeology project.
 *
 * Only `src/features/*` participates. `src/shared/`, `src/db/` and `src/lib/`
 * are leaves by the rule in CONTRIBUTING.md and are not nodes here.
 */

const FEATURES_DIR = join(ROOT, "src", "features");

function featureOf(file: string): string | null {
  const rel = relative(FEATURES_DIR, file);
  if (rel.startsWith("..")) return null;
  return rel.split(sep)[0];
}

function featureGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const entry of readdirSync(FEATURES_DIR)) {
    if (statSync(join(FEATURES_DIR, entry)).isDirectory()) graph.set(entry, new Set());
  }
  for (const file of listFiles(FEATURES_DIR)) {
    const from = featureOf(file)!;
    for (const spec of specifiersIn(file)) {
      const target = resolveSpecifier(file, spec);
      const to = target && featureOf(target);
      if (to && to !== from) graph.get(from)!.add(to);
    }
  }
  return graph;
}

/** First cycle found by DFS, as the path of features that closes it, or null. */
function findCycle(graph: Map<string, Set<string>>): string[] | null {
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (node: string): string[] | null => {
    state.set(node, "visiting");
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const s = state.get(next);
      if (s === "visiting") return [...stack.slice(stack.indexOf(next)), next];
      if (s === undefined) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(node, "done");
    return null;
  };
  for (const node of graph.keys()) {
    if (!state.has(node)) {
      const found = visit(node);
      if (found) return found;
    }
  }
  return null;
}

describe("feature → feature import graph", () => {
  const graph = featureGraph();

  it("has edges, so a pass is not vacuous", () => {
    expect(graph.size).toBeGreaterThan(1);
    expect([...graph.values()].some((edges) => edges.size > 0)).toBe(true);
  });

  it("has no cycles", () => {
    const cycle = findCycle(graph);
    expect(cycle, cycle ? `cycle: ${cycle.join(" → ")}` : undefined).toBeNull();
  });
});
