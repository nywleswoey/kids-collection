import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { ROOT, listFiles, crawlImports } from "./module-graph";

/**
 * Play-facing binder must never import admin (kc-binder layering follow-up).
 *
 * `src/features/binder` renders under `app/play`; `src/features/admin` is the
 * parent-gated surface. Admin composes binder's shared pieces (rarity-slot,
 * RarityThumb) itself — that direction is fine — but binder reaching back into
 * admin puts admin-only UI behind a play import and inverts the boundary. The
 * crawl is transitive, so the rule is a property of the code rather than a fact
 * about today's call sites: binder → card → admin is caught too.
 */

const FORBIDDEN = join(ROOT, "src", "features", "admin");
const ENTRY_DIR = join(ROOT, "src", "features", "binder");

describe("binder → admin layering", () => {
  it("nothing reachable from src/features/binder imports src/features/admin", () => {
    const entries = listFiles(ENTRY_DIR);
    expect(entries.length).toBeGreaterThan(0); // a silent empty sweep proves nothing

    const { reached, offenders } = crawlImports(entries, FORBIDDEN);

    // Without this, a crawl that never left binder itself would still pass.
    expect(reached.some((f) => !f.startsWith(ENTRY_DIR))).toBe(true);
    expect(offenders).toEqual([]);
  });
});
