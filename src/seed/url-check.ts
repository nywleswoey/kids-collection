/**
 * Does every card's `sourceUrl` still resolve? (Inc24 FR11)
 *
 * A separate `pnpm seed --check-urls` flag, NOT a rule inside `loadSeed`: putting
 * 360 network calls behind a synchronous parser would make every seed command slow
 * and network-dependent, including ones that touch no URLs. `loadSeed` stays pure,
 * synchronous and network-free (NFR4).
 *
 * Covers every card in the file, not just unpublished ones (Q3=A) — it stays
 * DB-free, and the 300 existing sourceUrls have had the longest time to rot.
 * Parenthesised Wikipedia suffixes 404 often enough to be worth automating.
 *
 * ── Rate limiting is NOT rot ─────────────────────────────────────────────────
 * The first build of this check ran 8-wide with Node's default user-agent and came
 * back with ~100 "failures" against wikipedia.org, every one of them a 429. That is
 * worse than having no check at all: the operator's response to a reported failure
 * is to go and edit the URL, so a checker that cries wolf actively damages good
 * data. Hence three things, none of them optional:
 *
 *   1. A descriptive User-Agent. Wikipedia throttles generic agents hard, and its
 *      API etiquette asks for one that identifies the caller.
 *   2. Modest default concurrency.
 *   3. Retry on 429/5xx with backoff honouring Retry-After — the same shape
 *      `image.ts` already uses against Pollinations' anonymous tier.
 *
 * Only a status that survives the retries is reported. `fetchImpl` is injected,
 * per the convention `image.ts` sets, so all of this is testable without a network.
 */
import type { SeedFile } from "./seed-schema";
import { SEP } from "./publish-plan";

export type FetchImpl = typeof fetch;

/** Identifies the caller to hosts that (reasonably) throttle anonymous traffic. */
export const USER_AGENT =
  "star-catchers-seed-linkcheck/1.0 (private family card app; contact via repo)";

/** A card whose sourceUrl did not answer 200. */
export interface UrlFailure {
  theme: string;
  card: string;
  url: string;
  /** HTTP status, or the thrown error's message when the request never completed. */
  status: number | string;
}

/** Retried: transient by nature, and none of them mean the URL is wrong. */
function isTransient(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

function parseRetryAfter(headers?: Headers): number | undefined {
  const raw = headers?.get?.("retry-after");
  if (!raw) return undefined;
  const secs = Number(raw);
  return Number.isFinite(secs) && secs >= 0 ? secs * 1000 : undefined;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Request every sourceUrl; resolve with the failures only.
 *
 * GET rather than HEAD: Wikipedia and others answer HEAD differently from GET, and
 * a check that disagrees with what a human clicking the link would see is worse
 * than no check at all.
 */
export async function checkSourceUrls(
  seed: SeedFile,
  opts: {
    fetchImpl?: FetchImpl;
    concurrency?: number;
    retries?: number;
    baseDelayMs?: number;
  } = {},
): Promise<UrlFailure[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const limit = Math.max(1, opts.concurrency ?? 4);
  const retries = opts.retries ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 2000;

  const targets = seed.themes.flatMap((theme) =>
    theme.cards.map((card) => ({
      theme: theme.name,
      card: card.name,
      url: card.sourceUrl,
    })),
  );

  /** Final status for one URL, after exhausting retries on transient failures. */
  async function statusOf(url: string): Promise<number | string> {
    let last: number | string = "no attempt";
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetchImpl(url, {
          redirect: "follow",
          headers: { "user-agent": USER_AGENT },
        });
        if (res.status === 200) return 200;
        last = res.status;
        if (!isTransient(res.status)) return res.status; // a real 404 is final
        if (attempt < retries) {
          await sleep(parseRetryAfter(res.headers) ?? baseDelayMs * 2 ** attempt);
        }
      } catch (err) {
        last = String(err);
        if (attempt < retries) await sleep(baseDelayMs * 2 ** attempt);
      }
    }
    return last;
  }

  const failures: UrlFailure[] = [];
  const queue = [...targets];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const t = queue.shift()!;
      const status = await statusOf(t.url);
      if (status !== 200) failures.push({ ...t, status });
    }
  });
  await Promise.all(workers);

  // Stable, file-order output: workers finish out of order, and a check whose
  // report reshuffles between runs is hard to diff.
  const order = new Map(targets.map((t, i) => [`${t.theme}${SEP}${t.card}`, i]));
  return failures.sort(
    (a, b) =>
      (order.get(`${a.theme}${SEP}${a.card}`) ?? 0) - (order.get(`${b.theme}${SEP}${b.card}`) ?? 0),
  );
}
