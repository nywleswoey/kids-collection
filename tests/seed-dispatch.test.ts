import { basename } from "node:path";
import { describe, it, expect, vi } from "vitest";

// Every pool read and write is injected below, so nothing here may reach the
// real client. A proxy that throws on any use proves it, and keeps importing
// the CLI free of a DATABASE_URL.
vi.mock("@/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("seed-dispatch tests must not touch the real database");
      },
    },
  ),
}));

import { runSeed, type SeedDeps } from "../scripts/seed/index";
import { providerById } from "@/shared/pool/providers";
import { buildSidecar, reviewFileName, sidecarFileName } from "@/shared/pool/review-files";
import { parseProvenance } from "@/shared/pool/provenance";
import { cardKey } from "@/shared/pool/publish-plan";
import type { BlastRadius } from "@/shared/pool/blast-radius";
import type { PublishedCount } from "@/shared/pool/completeness";
import type { SeedCard, SeedFile } from "@/shared/pool/seed-schema";

/**
 * The seed CLI's dispatcher (A2) against fakes. These pin the ordering
 * invariants that only ever lived in `main()`: the prune decision and the FR9
 * refusal happen before any write, and provenance is recorded only for cards
 * this run `inserted`.
 */

const THEME = "Birds";
const PROVIDER = providerById("cloudflare-sdxl")!;

function card(name: string): SeedCard {
  return {
    name,
    rarity: "common",
    eduText: `${name} facts`,
    imagePrompt: `a ${name}`,
    sourceUrl: `https://example.org/${name}`,
  };
}

const SEED: SeedFile = {
  themes: [{ name: THEME, provider: PROVIDER.id, cards: [card("Robin"), card("Wren")] }],
};

const NONE: BlastRadius = {
  themes: 0,
  cards: 0,
  collectionRows: 0,
  perChild: [],
  themeNames: [],
  cardNames: [],
};

const PRUNE: BlastRadius = {
  themes: 1,
  cards: 30,
  collectionRows: 7,
  perChild: [{ name: "Ada", rows: 7 }],
  themeNames: ["Dropped"],
  cardNames: [],
};

/** Operations that change the pool, Blob or the working tree. */
const WRITES = new Set([
  "upsertTheme",
  "insertCardIfNew",
  "updateCardMeta",
  "deleteCardsNotIn",
  "deleteThemesNotIn",
  "uploadImage",
  "fs.write",
  "fs.mkdir",
]);

interface Harness {
  deps: SeedDeps;
  calls: string[];
  written: Map<string, string | Uint8Array>;
  published: Set<string>;
}

/** A review candidate plus its sidecar, as `--review` would leave them. */
function reviewed(...names: string[]): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const name of names) {
    const c = card(name);
    files.set(reviewFileName(THEME, c, PROVIDER), new Uint8Array([1, 2, 3]));
    const sidecar = buildSidecar(PROVIDER, { bytes: new Uint8Array(), format: "png" });
    files.set(
      sidecarFileName(THEME, c, PROVIDER),
      new TextEncoder().encode(JSON.stringify(sidecar)),
    );
  }
  return files;
}

function harness(
  opts: {
    published?: string[];
    files?: Map<string, Uint8Array>;
    prune?: BlastRadius;
    inserted?: (name: string) => "inserted" | "skipped";
    confirm?: () => Promise<void>;
    shape?: PublishedCount[];
  } = {},
): Harness {
  const calls: string[] = [];
  const written = new Map<string, string | Uint8Array>();
  const published = new Set((opts.published ?? []).map((n) => cardKey(THEME, n)));
  const files = opts.files ?? new Map<string, Uint8Array>();
  const noop = () => {};

  const deps: SeedDeps = {
    env: { databaseUrl: "postgres://postgres@localhost:5499/fake", blobToken: "fake" },
    loadSeed: () => SEED,
    listPublishedCardKeys: async () => {
      calls.push("listPublishedCardKeys");
      return new Set(published);
    },
    readPublishedImages: async () => [],
    readPublishedShape: async () => opts.shape ?? [],
    upsertTheme: async (name) => {
      calls.push("upsertTheme");
      return `id-${name}`;
    },
    insertCardIfNew: async (input) => {
      calls.push("insertCardIfNew");
      return opts.inserted?.(input.name) ?? "inserted";
    },
    updateCardMeta: async () => {
      calls.push("updateCardMeta");
      return "updated";
    },
    deleteCardsNotIn: async () => {
      calls.push("deleteCardsNotIn");
      return 0;
    },
    deleteThemesNotIn: async () => {
      calls.push("deleteThemesNotIn");
      return 0;
    },
    previewPrune: async () => {
      calls.push("previewPrune");
      return opts.prune ?? NONE;
    },
    confirmDestructive: async () => {
      calls.push("confirmDestructive");
      await opts.confirm?.();
    },
    uploadImage: async (key) => {
      calls.push("uploadImage");
      return `https://blob.example/${key}`;
    },
    uploadAnimation: async (key) => {
      calls.push("uploadAnimation");
      return `https://blob.example/${key}-anim.webp`;
    },
    fs: {
      exists: (path) => files.has(basename(path)),
      read: (path) => {
        const bytes = files.get(basename(path));
        if (!bytes) throw new Error(`ENOENT ${path}`);
        return bytes;
      },
      write: (path, data) => {
        calls.push("fs.write");
        written.set(basename(path), data);
      },
      mkdir: () => {
        calls.push("fs.mkdir");
      },
    },
    log: noop,
    warn: noop,
    error: noop,
  };
  return { deps, calls, written, published };
}

function writes(calls: string[]): string[] {
  return calls.filter((c) => WRITES.has(c));
}

describe("runSeed --sync: the prune decision comes before any write", () => {
  it("aborts with nothing written when prunes are pending and --allow-prune is absent", async () => {
    const h = harness({ prune: PRUNE, files: reviewed("Robin", "Wren") });

    const code = await runSeed({ kind: "sync", allowPrune: false }, h.deps);

    expect(code).toBe(1);
    expect(h.calls).toContain("previewPrune");
    expect(h.calls).not.toContain("confirmDestructive");
    expect(writes(h.calls)).toEqual([]);
  });

  it("with --allow-prune, confirms before the first write", async () => {
    const h = harness({ prune: PRUNE, published: ["Robin", "Wren"] });

    await runSeed({ kind: "sync", allowPrune: true }, h.deps);

    const confirmAt = h.calls.indexOf("confirmDestructive");
    const firstWrite = h.calls.findIndex((c) => WRITES.has(c));
    expect(confirmAt).toBeGreaterThanOrEqual(0);
    expect(firstWrite).toBeGreaterThan(confirmAt);
    expect(h.calls).toContain("deleteThemesNotIn");
  });

  it("writes nothing when the operator declines the prune", async () => {
    const h = harness({
      prune: PRUNE,
      published: ["Robin", "Wren"],
      confirm: async () => {
        throw new Error("declined");
      },
    });

    await expect(runSeed({ kind: "sync", allowPrune: true }, h.deps)).rejects.toThrow("declined");
    expect(writes(h.calls)).toEqual([]);
  });
});

describe("runSeed: the FR9 refusal comes before any write, with no bypass", () => {
  it("refuses a planned card with no reviewed image, writing nothing", async () => {
    // Robin is reviewed, Wren is not: a partial review still writes nothing.
    const h = harness({ files: reviewed("Robin") });

    const code = await runSeed({ kind: "sync", allowPrune: false }, h.deps);

    expect(code).toBe(1);
    expect(h.calls).toContain("listPublishedCardKeys");
    expect(writes(h.calls)).toEqual([]);
  });

  it("publishes once every planned card has a reviewed image", async () => {
    // FR12's completeness check runs at the end of every --sync, so the shape
    // fed back has to match what this run just inserted — both cards, both
    // common — or it reads as a shortfall rather than success.
    const h = harness({
      files: reviewed("Robin", "Wren"),
      shape: [{ theme: THEME, rarity: "common", n: 2 }],
    });

    const code = await runSeed({ kind: "sync", allowPrune: false }, h.deps);

    expect(code).toBe(0);
    expect(h.calls.filter((c) => c === "insertCardIfNew")).toHaveLength(2);
  });
});

describe("runSeed: provenance is recorded only for cards this run inserted", () => {
  it("records the inserted card and not the one insertCardIfNew skipped", async () => {
    const h = harness({
      files: reviewed("Robin", "Wren"),
      inserted: (name) => (name === "Robin" ? "inserted" : "skipped"),
    });

    await runSeed({ kind: "sync", allowPrune: false }, h.deps);

    const raw = h.written.get("provenance.json");
    expect(raw).toBeTypeOf("string");
    const file = parseProvenance(JSON.parse(raw as string));
    expect(Object.keys(file.themes[THEME] ?? {})).toEqual(["Robin"]);
  });

  it("writes no provenance file when nothing was inserted", async () => {
    const h = harness({ files: reviewed("Robin", "Wren"), inserted: () => "skipped" });

    await runSeed({ kind: "sync", allowPrune: false }, h.deps);

    expect(h.written.has("provenance.json")).toBe(false);
  });
});
