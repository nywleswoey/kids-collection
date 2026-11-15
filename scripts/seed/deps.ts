/**
 * Everything the seed commands read, write or ask, behind one injectable
 * object (A2) — the same idea as `BakeOffDeps` in `bake-off.ts`, at the
 * top-level dispatcher instead of one lane. `realSeedDeps()` wires the
 * database, Blob, the filesystem and the TTY guard; `tests/seed-dispatch.test.ts`
 * injects fakes to check the ordering invariants (prune decision and FR9
 * refusal before any write, provenance for `inserted` only) with no database.
 *
 * Also the small helpers every command shares: the three seed-content paths,
 * reading text through `deps.fs`, and the env knobs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSeed } from "@/seed/loader";
import { uploadImage, uploadAnimation } from "@/seed/image";
import { readApprovedAnimation } from "@/seed/animated-brief";
import { reviewFileName, type NamedCard } from "@/seed/review-files";
import type { SeedFile } from "@/seed/seed-schema";
import type { ImageProvider } from "@/seed/providers";
import {
  listPublishedCardKeys,
  readPublishedImages,
  readPublishedShape,
} from "@/seed/pool-reads";
import {
  upsertTheme,
  insertCardIfNew,
  updateCardMeta,
  deleteThemesNotIn,
  deleteCardsNotIn,
} from "@/seed/writer";
import { previewPrune } from "@/seed/blast-radius";
import { confirmDestructive } from "./guard";

export const SEED_PATH = join(process.cwd(), "seed-content", "cards.json");
export const REVIEW_DIR = join(process.cwd(), "seed-content", "review");
/** Committed, generated, never hand-edited — see `src/seed/provenance.ts` (#75). */
export const PROVENANCE_PATH = join(process.cwd(), "seed-content", "provenance.json");

export interface SeedDeps {
  env: { databaseUrl?: string; blobToken?: string };
  loadSeed: () => SeedFile;
  listPublishedCardKeys: typeof listPublishedCardKeys;
  readPublishedImages: typeof readPublishedImages;
  readPublishedShape: typeof readPublishedShape;
  upsertTheme: typeof upsertTheme;
  insertCardIfNew: typeof insertCardIfNew;
  updateCardMeta: typeof updateCardMeta;
  deleteCardsNotIn: typeof deleteCardsNotIn;
  deleteThemesNotIn: typeof deleteThemesNotIn;
  previewPrune: typeof previewPrune;
  confirmDestructive: typeof confirmDestructive;
  uploadImage: typeof uploadImage;
  uploadAnimation: typeof uploadAnimation;
  readApprovedAnimation: (prompt: string, providerId: string) => Uint8Array | undefined;
  fs: {
    exists: (path: string) => boolean;
    read: (path: string) => Uint8Array;
    write: (path: string, data: string | Uint8Array) => void;
    mkdir: (path: string) => void;
  };
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function realSeedDeps(): SeedDeps {
  return {
    env: {
      databaseUrl: process.env.DATABASE_URL,
      blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    },
    loadSeed: () => loadSeed(SEED_PATH),
    listPublishedCardKeys,
    readPublishedImages,
    readPublishedShape,
    upsertTheme,
    insertCardIfNew,
    updateCardMeta,
    deleteCardsNotIn,
    deleteThemesNotIn,
    previewPrune,
    confirmDestructive,
    uploadImage,
    uploadAnimation,
    readApprovedAnimation: (prompt, providerId) => readApprovedAnimation(prompt, providerId),
    fs: {
      exists: existsSync,
      read: (path) => new Uint8Array(readFileSync(path)),
      write: (path, data) => writeFileSync(path, data),
      mkdir: (path) => mkdirSync(path, { recursive: true }),
    },
    log: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  };
}

export function readText(deps: SeedDeps, path: string): string {
  return new TextDecoder().decode(deps.fs.read(path));
}

/** Absolute path of one bake-off candidate. */
export function reviewPath(themeName: string, card: NamedCard, provider: ImageProvider): string {
  return join(REVIEW_DIR, reviewFileName(themeName, card, provider));
}

export function requireDatabaseUrl(deps: SeedDeps, usage: string): void {
  if (!deps.env.databaseUrl) {
    throw new Error(`DATABASE_URL is not set. Run with your env loaded, e.g. ${usage}.`);
  }
}

/** Read a non-negative integer from env, falling back to `def` if unset/invalid. */
export function intEnv(name: string, def: number): number {
  const raw = process.env[name];
  if (raw === undefined) return def;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : def;
}

/** Run tasks with a small concurrency cap (U3-PERF). */
export async function runPool<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}
