/**
 * Pure judging logic for `pnpm theme-images`'s review step (see AGENTS.md and
 * `seed-content/NEW-THEME-RUNBOOK.md`'s "both lanes at once" subsection).
 *
 * For a card with more than one candidate image, the local `claude` CLI
 * (headless, `claude -p`) is asked to pick between them against the card's
 * exact prompt and the runbook's rejection criteria (text baked in, a frame
 * or border, a blank/black frame, the wrong subject, anything not
 * kid-friendly), and returns a one-line reason. The pick is advisory: nothing
 * here writes to `seed-content/cards.json`, and nothing here publishes — Step
 * 8's human pick stays the only thing `--sync` reads.
 *
 * Verdicts are cached by the candidates' content hashes (`candidateCacheKey`),
 * so a re-run never re-judges a pair whose bytes haven't changed, even across
 * separate `pnpm theme-images` runs. `judgeCard` mutates the `cache` object it
 * is given (adds the new entry under its key) rather than returning a new one
 * — the caller reads it once before the loop and writes it once after, the
 * same load-once/write-once shape `provenance.ts` uses for the same reason: a
 * cache rewritten per card would be a torn record if the run died halfway.
 *
 * No API key, no SDK, no network call of its own: `runJudge` is injected, and
 * the only real implementation (`scripts/theme-images/judge-runner.ts`) spawns
 * the `claude` subprocess exactly once per card. This module never spawns
 * anything, which is what keeps it unit-testable with no CLI on PATH.
 */
import { createHash } from "node:crypto";

export interface JudgeCandidate {
  providerId: string;
  /** Absolute path, named in the judge prompt so `claude` can read the file itself. */
  path: string;
  bytes: Uint8Array;
}

export interface JudgeVerdict {
  winner: string;
  reason: string;
}

/** One cache entry: the verdict, plus when it was recorded (informational only). */
export interface JudgeCacheEntry extends JudgeVerdict {
  judgedAt: string;
}

export type JudgeCache = Record<string, JudgeCacheEntry>;

export type JudgeOutcome =
  | { status: "missing" }
  | { status: "single"; winner: string; reason: string }
  | { status: "cached"; winner: string; reason: string }
  | { status: "judged"; winner: string; reason: string }
  | { status: "unjudged"; reason: string };

export interface RunJudgeResult {
  ok: boolean;
  timedOut: boolean;
  error?: string;
  /** Raw CLI output (the `--output-format json` envelope), present only when `ok`. */
  output?: string;
}

/** Invokes `claude -p` for one card's judge prompt. Injected so tests never spawn the real CLI. */
export type JudgeRunner = (prompt: string, timeoutMs: number) => RunJudgeResult;

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Stable, order-independent cache key for one card's candidate set.
 *
 * Keyed on content hashes rather than file names: a candidate regenerated
 * with identical bytes (a re-run that found nothing new to draw) still hits
 * the cache, while a file whose bytes actually changed misses it and gets
 * re-judged.
 */
export function candidateCacheKey(
  candidates: readonly Pick<JudgeCandidate, "providerId" | "bytes">[],
): string {
  return candidates
    .map((c) => `${c.providerId}:${sha256Hex(c.bytes)}`)
    .sort()
    .join("|");
}

/** Parse the on-disk cache. A missing or corrupt file reads as empty — nothing to resume from, never an abort. */
export function parseJudgeCache(raw: string): JudgeCache {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JudgeCache;
    }
    return {};
  } catch {
    return {};
  }
}

export function serializeJudgeCache(cache: JudgeCache): string {
  return `${JSON.stringify(cache, null, 2)}\n`;
}

/** The runbook's rejection criteria (Step 6's screening list, kid-safety subset) — see NEW-THEME-RUNBOOK.md. */
export const JUDGE_REJECTION_CRITERIA: readonly string[] = [
  "text baked into the image",
  "a frame or border around the subject",
  "a blank or black frame (a failed render)",
  "the wrong subject for the prompt",
  "anything that is not kid-friendly (scary, violent, or otherwise inappropriate)",
];

/** The exact prompt sent to `claude -p` for one card's bake-off. */
export function buildJudgePrompt(
  cardName: string,
  imagePrompt: string,
  candidates: readonly Pick<JudgeCandidate, "providerId" | "path">[],
): string {
  const list = candidates.map((c) => `- ${c.providerId}: ${c.path}`).join("\n");
  return (
    `You are judging candidate card-art images for a kids' trading card game. ` +
    `Card: "${cardName}". Read every candidate file below, then judge each against ` +
    `the exact image prompt it was generated from:\n\n${imagePrompt}\n\n` +
    `Candidates:\n${list}\n\n` +
    `Reject a candidate that has any of:\n` +
    JUDGE_REJECTION_CRITERIA.map((r) => `- ${r}`).join("\n") +
    `\n\nPick the better candidate. Respond with ONLY a single JSON object and no other ` +
    `text: {"winner": "<providerId>", "reason": "<one short sentence>"}.`
  );
}

/** Extract `{winner, reason}` from the judge's raw reply, however the CLI wrapped it. */
export function parseJudgeOutput(
  raw: string,
  validProviderIds: readonly string[],
): JudgeVerdict | undefined {
  const tryParse = (text: string): JudgeVerdict | undefined => {
    try {
      const obj = JSON.parse(text);
      if (
        obj &&
        typeof obj === "object" &&
        typeof obj.winner === "string" &&
        typeof obj.reason === "string" &&
        validProviderIds.includes(obj.winner)
      ) {
        return { winner: obj.winner, reason: obj.reason };
      }
    } catch {
      // not JSON; fall through to the other strategies below
    }
    return undefined;
  };

  // `claude -p --output-format json` wraps the model's final reply in an
  // envelope under `.result`. Try that first, then the raw text (in case the
  // runner already unwrapped it), then a best-effort scrape for a lone JSON
  // object anywhere in the output.
  try {
    const envelope = JSON.parse(raw);
    if (envelope && typeof envelope === "object" && typeof envelope.result === "string") {
      const nested = tryParse(envelope.result);
      if (nested) return nested;
    }
  } catch {
    // not an envelope; fall through
  }

  const direct = tryParse(raw);
  if (direct) return direct;

  const match = raw.match(/\{[^{}]*"winner"[^{}]*\}/s);
  return match ? tryParse(match[0]) : undefined;
}

const DEFAULT_JUDGE_TIMEOUT_MS = 2 * 60 * 1000;

export interface JudgeCardOptions {
  cardName: string;
  imagePrompt: string;
  candidates: readonly JudgeCandidate[];
  /** Read and updated in place — see the module header. */
  cache: JudgeCache;
  /** undefined means the `claude` CLI could not be used at all (not on PATH, etc). */
  runJudge: JudgeRunner | undefined;
  timeoutMs?: number;
  now?: () => string;
}

/**
 * Judge one card's candidates, consulting (and updating) the cache. Never
 * throws — a failed, timed-out, or unavailable judge leaves the card
 * `unjudged` rather than aborting the run; a card with one or zero usable
 * candidates never calls the judge at all.
 */
export function judgeCard(opts: JudgeCardOptions): JudgeOutcome {
  const { candidates } = opts;
  if (candidates.length === 0) return { status: "missing" };
  if (candidates.length === 1) {
    return { status: "single", winner: candidates[0]!.providerId, reason: "only candidate available" };
  }

  const key = candidateCacheKey(candidates);
  const cached = opts.cache[key];
  if (cached) return { status: "cached", winner: cached.winner, reason: cached.reason };

  if (!opts.runJudge) {
    return { status: "unjudged", reason: "the claude CLI is not on PATH" };
  }

  const prompt = buildJudgePrompt(opts.cardName, opts.imagePrompt, candidates);
  let result: RunJudgeResult;
  try {
    result = opts.runJudge(prompt, opts.timeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS);
  } catch (err) {
    return { status: "unjudged", reason: err instanceof Error ? err.message : String(err) };
  }

  if (!result.ok || result.output === undefined) {
    return {
      status: "unjudged",
      reason: result.timedOut ? "claude timed out" : result.error ?? "claude CLI failed",
    };
  }

  const verdict = parseJudgeOutput(
    result.output,
    candidates.map((c) => c.providerId),
  );
  if (!verdict) {
    return { status: "unjudged", reason: "claude did not return a usable verdict" };
  }

  const now = opts.now ?? (() => new Date().toISOString());
  opts.cache[key] = { ...verdict, judgedAt: now() };
  return { status: "judged", ...verdict };
}
