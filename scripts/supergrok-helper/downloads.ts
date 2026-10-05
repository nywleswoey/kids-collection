/**
 * Pure matching logic for watching ~/Downloads for a newly saved picture.
 *
 * Kept free of `fs`/timers so it can be unit tested with plain fixture data;
 * `index.ts` owns the actual polling loop and the filesystem calls.
 */

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

export interface DirEntrySnapshot {
  name: string;
  mtimeMs: number;
}

/** True for a name this tool will treat as an image, independent of case. */
export function isImageFile(name: string): boolean {
  return IMAGE_EXT.test(name);
}

/**
 * The most recently modified image in `entries` whose mtime is at or after
 * `sinceMs`, or undefined if none qualifies.
 *
 * "Most recent" rather than "first match" because a save can briefly leave a
 * browser's in-progress temp file (e.g. `.crdownload`) alongside the final
 * one; filtering to recognised image extensions already excludes those, but
 * picking the newest also copes with a leftover older image sitting in the
 * folder from an unrelated download.
 */
export function pickNewestImageSince(
  entries: readonly DirEntrySnapshot[],
  sinceMs: number,
): DirEntrySnapshot | undefined {
  const candidates = entries.filter((e) => isImageFile(e.name) && e.mtimeMs >= sinceMs);
  if (candidates.length === 0) return undefined;
  return candidates.reduce((newest, e) => (e.mtimeMs > newest.mtimeMs ? e : newest));
}
