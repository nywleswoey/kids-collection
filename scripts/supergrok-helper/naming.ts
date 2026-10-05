/**
 * Pure naming for the picture the walker actually saves.
 *
 * `ManualBriefEntry.fileName` (from `planManualBrief`) always suggests `.png`,
 * but the runbook accepts whatever extension Grok itself downloaded
 * (`.jpg`/`.jpeg`/`.webp`) as long as the stem is kept — `findDropFile` only
 * matches on the hash suffix, not the extension. This keeps the destination
 * filename's stem (theme-card-hash) while swapping in the extension of the
 * file that was actually dropped into Downloads.
 */
import { extname } from "node:path";

export function destFileName(entry: { fileName: string }, downloadedName: string): string {
  const stem = entry.fileName.replace(/\.[^./]+$/, "");
  const ext = extname(downloadedName).toLowerCase();
  return `${stem}${ext}`;
}
