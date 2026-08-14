/**
 * The eager bake-off runner (#63's shape, #67's mechanics).
 *
 * #63 resolved `--review` to generating every NEW card from every registered
 * provider, so a human can compare a subject x provider row and record the pick
 * in `seed/cards.json`. This module is the scheduler for that fan-out.
 *
 * ── One pool per lane, and why it is not one pool of 90 jobs ─────────────────
 * #63 called per-provider throttling a REQUIREMENT of its decision rather than
 * an optimisation, and stated the consequence plainly: under one global gate the
 * eager bake-off costs N x the wall-clock and the map's throughput driver is
 * actively harmed. The gate the CLI used to have was a single module-level
 * `nextSlot` shared by every worker across every theme.
 *
 * So each provider gets its own queue, its own gate and its own concurrency, and
 * the lanes run alongside each other. Wall-clock becomes the slowest single lane
 * rather than the sum, which is what makes 90 images cost roughly what 30 cost
 * before. The pacing numbers differ by orders of magnitude — Pollinations is
 * capped at one request per 15s, Cloudflare tolerates 720 a minute — which is why
 * they are declared by the adapter and not by one global env var.
 *
 * ── The circuit breaker, and why it is not a #68 classifier ──────────────────
 * #68 forbids a quota-vs-rate detector: Cloudflare's exhaustion signal is
 * undocumented and Pollinations' 429 means the opposite thing, so a detector
 * would fail open. Every terminal failure is just `ProviderFailedTerminally`,
 * with no cause attached.
 *
 * But exhaustion has a SHAPE even when its signal is unreadable — it does not
 * recover. If a lane dies at card 12, cards 13-30 die too, each first paying a
 * full retry ladder. So the breaker counts consecutive terminal failures and
 * abandons the lane at a threshold. It never inspects an error, only tallies
 * one, which is inference from behaviour rather than classification of a signal.
 *
 * A lane dying is not a run dying. The other lanes finish, the contact sheet
 * shows the gap, and the human simply has fewer candidates in some rows. It is
 * also never a PUBLISH failure: `--sync` asks whether the RESOLVED provider's
 * bytes exist, so a dead lane only matters if a human picked it — and then FR9
 * refuses that card by name.
 */
import {
  ProviderFailedTerminally,
  ProviderRetryable,
  type GeneratedImage,
  type ImageProvider,
} from "./providers/provider";

export interface BakeOffJob<T> {
  theme: string;
  card: T;
}

export interface LaneOutcome {
  providerId: string;
  /** Candidates written this run. */
  generated: number;
  /** Candidates already on disk — a resumed run pays nothing for these. */
  skipped: number;
  /** Jobs attempted and terminally failed. */
  failed: number;
  /** Jobs never attempted because the breaker tripped first. */
  notAttempted: number;
  abandoned: boolean;
}

export interface BakeOffDeps<T> {
  /** Already has a candidate on disk? Resume support, per job and per lane. */
  isReviewed(job: BakeOffJob<T>, provider: ImageProvider): boolean;
  /** Build the prompt sent to the provider. */
  buildPrompt(card: T): string;
  /** Persist one candidate. */
  save(job: BakeOffJob<T>, provider: ImageProvider, image: GeneratedImage): Promise<void> | void;
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  size: { width: number; height: number };
  retries: number;
  /** Consecutive terminal failures that abandon a lane. */
  breakerThreshold?: number;
  baseDelayMs?: number;
  rateLimitDelayMs?: number;
  /** Injectable so tests do not spend real seconds proving a backoff ramp. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_BREAKER_THRESHOLD = 3;

export async function runBakeOff<T>(
  jobs: readonly BakeOffJob<T>[],
  providers: readonly ImageProvider[],
  deps: BakeOffDeps<T>,
): Promise<LaneOutcome[]> {
  return Promise.all(providers.map((provider) => runLane(jobs, provider, deps)));
}

async function runLane<T>(
  jobs: readonly BakeOffJob<T>[],
  provider: ImageProvider,
  deps: BakeOffDeps<T>,
): Promise<LaneOutcome> {
  const sleep = deps.sleep ?? realSleep;
  const threshold = deps.breakerThreshold ?? DEFAULT_BREAKER_THRESHOLD;
  const gate = makeGate(provider.minIntervalMs, sleep);

  const outcome: LaneOutcome = {
    providerId: provider.id,
    generated: 0,
    skipped: 0,
    failed: 0,
    notAttempted: 0,
    abandoned: false,
  };

  const queue = [...jobs];
  let consecutiveFailures = 0;

  const worker = async () => {
    while (queue.length > 0 && !outcome.abandoned) {
      const job = queue.shift()!;

      // Resume: a candidate already on disk costs nothing, and notably does not
      // touch the gate — so re-running after an interrupted session is fast
      // rather than re-paying the pacing for work already done.
      if (deps.isReviewed(job, provider)) {
        outcome.skipped++;
        continue;
      }

      let image: GeneratedImage;
      try {
        image = await withRetry(
          provider,
          () => gate().then(() => provider.generate(deps.buildPrompt(job.card), deps.size)),
          deps,
          sleep,
        );
      } catch (err) {
        outcome.failed++;
        consecutiveFailures++;
        deps.error(`  ✗ ${job.theme} / ${describe(job.card)} [${provider.id}]: ${String(err)}`);
        if (consecutiveFailures >= threshold) {
          outcome.abandoned = true;
          deps.warn(
            `⚠️  lane ${provider.id} abandoned after ${threshold} consecutive failures — ` +
              `remaining cards skipped, not retried.`,
          );
        }
        continue;
      }

      // The provider answered, so the lane is demonstrably alive — the breaker
      // tallies only what it claims to, and a full disk under seed/review/ is a
      // local problem reported as one rather than as a dead lane.
      consecutiveFailures = 0;

      try {
        await deps.save(job, provider, image);
      } catch (err) {
        outcome.failed++;
        deps.error(
          `  ✗ ${job.theme} / ${describe(job.card)} [${provider.id}]: ` +
            `generated, but writing the candidate to disk failed — ${String(err)}`,
        );
        continue;
      }

      outcome.generated++;
      deps.log(`  ✓ ${job.theme} / ${describe(job.card)} [${provider.id}]`);
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(provider.concurrency, jobs.length)) }, worker),
  );

  // Exact by subtraction, which avoids racing several workers to read the
  // queue's length at the moment the breaker trips.
  outcome.notAttempted =
    jobs.length - outcome.generated - outcome.skipped - outcome.failed;
  return outcome;
}

/**
 * Bounded retry around ONE logical attempt.
 *
 * Only `ProviderRetryable` is retried. Anything else — a 4xx, a rejected prompt,
 * a wrong-sized image — fails the job immediately, because retrying a request
 * the provider has already judged just spends the lane's budget on a guaranteed
 * failure. Either way what escapes is `ProviderFailedTerminally` carrying no
 * classification of the cause (#68).
 *
 * Exported because `--publish --allow-unreviewed` generates outside a lane and
 * must honour the same `SEED_RETRIES` budget. A second ladder there would drift
 * from this one, and `generate()` stays ONE logical attempt either way.
 */
export async function withRetry<T>(
  provider: Pick<ImageProvider, "id">,
  attempt: () => Promise<T>,
  deps: Pick<BakeOffDeps<never>, "retries" | "baseDelayMs" | "rateLimitDelayMs">,
  sleep: (ms: number) => Promise<void> = realSleep,
): Promise<T> {
  const retries = deps.retries;
  const baseDelayMs = deps.baseDelayMs ?? 500;
  const rateLimitDelayMs = deps.rateLimitDelayMs ?? 8000;

  let lastErr: unknown;
  // Counted rather than derived from `retries`, so a non-retryable 4xx that
  // breaks out on the first pass is reported as the one attempt it spent.
  let attempts = 0;
  for (let n = 0; n <= retries; n++) {
    attempts++;
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof ProviderRetryable)) break;
      if (n === retries) break;
      await sleep(
        err.retryAfterMs ??
          (err.rateLimited ? rateLimitDelayMs * 2 ** n : baseDelayMs * 2 ** n),
      );
    }
  }
  throw new ProviderFailedTerminally(provider.id, attempts, lastErr);
}

/**
 * Hands out request slots at least `minIntervalMs` apart — one gate per lane,
 * closed over rather than module-level, which is the whole difference #63
 * demanded from the global `nextSlot` this replaces.
 */
export function makeGate(
  minIntervalMs: number,
  sleep: (ms: number) => Promise<void> = realSleep,
): () => Promise<void> {
  let nextSlot = 0;
  return async () => {
    if (minIntervalMs <= 0) return;
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + minIntervalMs;
    if (wait > 0) await sleep(wait);
  };
}

function describe(card: unknown): string {
  return typeof card === "object" && card !== null && "name" in card
    ? String((card as { name: unknown }).name)
    : String(card);
}

function realSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
