import { readFileSync } from "node:fs";
import { seedFileSchema, type SeedFile } from "./seed-schema";

/**
 * Load + validate the seed file. Fail-fast (U3-RES-3): throws on malformed
 * JSON or schema violation before any DB/Blob write.
 */
export function loadSeed(path: string): SeedFile {
  const raw = readFileSync(path, "utf8");
  const json = JSON.parse(raw);
  return seedFileSchema.parse(json);
}

/** Validate an already-parsed object (used by tests). */
export function parseSeed(json: unknown): SeedFile {
  return seedFileSchema.parse(json);
}
