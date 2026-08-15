/**
 * How much of the Blob allowance has the pool spent, and how many themes are
 * left? (#79)
 *
 * #79 asked whether Cloudflare SDXL's 14x-heavier cards are affordable, and
 * observed that nobody had looked at current Blob usage against its allowance —
 * "that number should come first: it may make this urgent or moot". This is the
 * command that produces the number, made repeatable rather than a one-off
 * dashboard visit, because the answer changes every time a theme publishes.
 *
 * ── What was measured, 2026-08-15 ────────────────────────────────────────────
 * Team `selwyn-yeows-projects`, plan **Hobby** — which is the first correction
 * #79 needed. The ticket assumed a card on file, so that "storage and bandwidth
 * growth converts directly into money". It does not: Hobby is not billed for
 * overage at all. Exceeding the Blob allowance **cuts off access to the store**
 * until the 30-day window rolls, and exceeding the image-optimization allowance
 * returns 402 for images not already cached, which renders as the `alt` text.
 * So the currency here is a broken binder, not a bill — which is worse, and is
 * why this is a command rather than a note.
 *
 *   meter                        used            Hobby allowance
 *   Blob storage                 31.36 MB        1 GB          <- what this reports
 *   Blob data transfer          102.32 MB        10 GB / 30d
 *   Blob simple operations       1,833           10,000 / 30d
 *   Blob advanced operations       215           2,000 / 30d
 *   Image transformations        2,998           5,000 / 30d
 *   Image cache reads            5,992           300,000 / 30d
 *   Image cache writes          14,439           100,000 / 30d
 *
 * Storage is at 3% — so the weight question is real but not urgent, and the
 * ceiling below is where it becomes urgent. The meter actually near its cap is
 * **image transformations at 60%**, and that one is indifferent to how heavy a
 * source image is: it is billed per cache MISS, so a 30-card theme costs at most
 * 30 x 4 requested widths = 120 transformations whichever lane drew it.
 *
 * ── Why this reads the STORE and not the pool ────────────────────────────────
 * `readPublishedImages` would be the cheaper source, and it under-reports.
 * `put()` adds a random suffix, so re-publishing a card writes a NEW object and
 * strands the old one: 403 objects against 390 cards, 1.02 MB of bytes nothing
 * points at, still charged. `list()` is the only view that sees them, so the
 * report reconciles the two and names the difference rather than hiding it.
 *
 * Reporting stranded bytes is where this stops — it never deletes. `del()` is
 * free and irreversible, and the operator's response to a reported orphan should
 * be to look at it, for the reason `url-check.ts` records: a checker whose
 * findings are acted on automatically is a checker that can destroy good data on
 * a bad measurement.
 *
 * ── Units ────────────────────────────────────────────────────────────────────
 * Decimal, because Vercel's dashboard is: it prints 31,363,297 bytes as
 * "31.36 MB / 1 GB". Using binary units here would put this report and the page
 * it has to be reconciled against 5% apart for no reason.
 */
import { list } from "@vercel/blob";
import { CARDS_PER_THEME } from "./seed-schema";

/**
 * Vercel's Hobby allowance for Blob storage size, in decimal bytes.
 *
 * Read off the team's own usage page (2026-08-15) rather than the docs, which
 * price the meter "Regional" and never state the Hobby number. It is a plan
 * fact, not a project one, so it changes when the plan changes — the day this
 * team goes Pro it becomes 5 GB with paid overage above, and the failure mode
 * stops being an outage and starts being a bill.
 */
export const BLOB_STORAGE_CEILING_BYTES = 1_000_000_000;

/**
 * Where the report stops being reassuring, as a fraction of the ceiling.
 *
 * 80% leaves ~200 MB, which is eight Cloudflare-weight themes — enough warning
 * to act during a run rather than after the one that failed. A line at the
 * ceiling itself would only ever describe an outage that had already happened.
 */
export const WARN_FRACTION = 0.8;

/**
 * Bytes as Vercel's dashboard prints them — decimal, two decimals, so a figure
 * from this report can be read straight across to the usage page.
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(2)} KB`;
  return `${bytes} B`;
}

/** One object in the Blob store, as `list()` reports it. */
export interface StoredObject {
  pathname: string;
  url: string;
  size: number;
}

/** The shape of a set of weights — a mean alone hides the distribution. */
export interface WeightSummary {
  count: number;
  totalBytes: number;
  meanBytes: number;
  medianBytes: number;
  maxBytes: number;
}

/**
 * How many more themes one lane's output fits in the remaining space.
 *
 * `null` where the lane declares no measured weight. Same discipline as
 * `provenance.model`: a fact nobody has witnessed is reported as absent, never
 * back-filled from a neighbouring lane's number.
 */
export interface LaneProjection {
  id: string;
  perCardBytes: number | null;
  themes: number | null;
}

export interface BlobBudget {
  /** Every object in the store, orphans included — this is what is charged. */
  store: WeightSummary;
  /** Objects no published card points at. Reported, never deleted. */
  orphans: { count: number; bytes: number };
  ceilingBytes: number;
  freeBytes: number;
  usedFraction: number;
  overWarnLine: boolean;
  projections: LaneProjection[];
}

/** A lane, as far as this module needs to know it. */
export interface WeighedLane {
  id: string;
  typicalCardBytes?: number;
}

export interface BlobBudgetInput {
  objects: readonly StoredObject[];
  /** `imageUrl` of every published card — what makes an object non-orphaned. */
  liveUrls: ReadonlySet<string>;
  lanes: readonly WeighedLane[];
  cardsPerTheme?: number;
  ceilingBytes?: number;
}

/** Count, total, mean, median and max of a set of encoded sizes. Pure. */
export function summariseWeights(sizes: readonly number[]): WeightSummary {
  if (sizes.length === 0) {
    return { count: 0, totalBytes: 0, meanBytes: 0, medianBytes: 0, maxBytes: 0 };
  }
  const sorted = [...sizes].sort((a, b) => a - b);
  const totalBytes = sorted.reduce((n, s) => n + s, 0);
  return {
    count: sorted.length,
    totalBytes,
    meanBytes: Math.round(totalBytes / sorted.length),
    medianBytes: sorted[Math.floor((sorted.length - 1) / 2)],
    maxBytes: sorted[sorted.length - 1],
  };
}

/**
 * Whole themes that fit in `freeBytes` at a given per-card weight.
 *
 * Whole, because a 30-card publish is the unit: a run that fills the store at
 * card 17 has left a short theme, which `comparePoolShape` reports as a
 * publishing fault and a child sees as an unreachable set-completion.
 */
export function themesThatFit(
  freeBytes: number,
  perCardBytes: number,
  cardsPerTheme: number = CARDS_PER_THEME,
): number {
  const perTheme = perCardBytes * cardsPerTheme;
  if (perTheme <= 0 || freeBytes <= 0) return 0;
  return Math.floor(freeBytes / perTheme);
}

/** Weigh the store against the allowance and project each lane's headroom. Pure. */
export function buildBlobBudget(input: BlobBudgetInput): BlobBudget {
  const ceilingBytes = input.ceilingBytes ?? BLOB_STORAGE_CEILING_BYTES;
  const cardsPerTheme = input.cardsPerTheme ?? CARDS_PER_THEME;

  const store = summariseWeights(input.objects.map((o) => o.size));
  const stranded = input.objects.filter((o) => !input.liveUrls.has(o.url));

  // Floored at zero: past the ceiling the useful statement is "no room", and a
  // negative would print as a negative theme count.
  const freeBytes = Math.max(0, ceilingBytes - store.totalBytes);
  const usedFraction = ceilingBytes > 0 ? store.totalBytes / ceilingBytes : 0;

  return {
    store,
    orphans: { count: stranded.length, bytes: stranded.reduce((n, o) => n + o.size, 0) },
    ceilingBytes,
    freeBytes,
    usedFraction,
    overWarnLine: usedFraction > WARN_FRACTION,
    projections: input.lanes.map((lane) => ({
      id: lane.id,
      perCardBytes: lane.typicalCardBytes ?? null,
      themes:
        lane.typicalCardBytes === undefined
          ? null
          : themesThatFit(freeBytes, lane.typicalCardBytes, cardsPerTheme),
    })),
  };
}

/** One page of `list()`, as much of it as this module reads. */
export interface StorePage {
  blobs: readonly StoredObject[];
  cursor?: string;
}

export type ListImpl = (opts: { limit: number; cursor?: string }) => Promise<StorePage>;

/**
 * Every object in the store, following the cursor.
 *
 * Paginated rather than single-page: 403 objects against a 1000-object page
 * means a single read is right today and silently truncating on the run that
 * matters — and a truncated read under-reports usage, which is the one direction
 * this report must never be wrong in.
 *
 * `list()` is an advanced operation, so this costs one per page against an
 * allowance of 2,000 per 30 days. Cheap enough to run before every bake-off,
 * which is what the runbook now asks for.
 */
export async function readStoreObjects(listImpl: ListImpl = list): Promise<StoredObject[]> {
  const objects: StoredObject[] = [];
  let cursor: string | undefined;
  do {
    const page = await listImpl({ limit: 1000, cursor });
    objects.push(...page.blobs.map((b) => ({ pathname: b.pathname, url: b.url, size: b.size })));
    cursor = page.cursor;
  } while (cursor);
  return objects;
}
