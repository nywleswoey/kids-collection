/**
 * Pure concurrency orchestration for `pnpm theme-images`'s two provider
 * lanes — the Grok lane (`pnpm supergrok "<Theme>" --auto`) and the
 * Cloudflare lane (`pnpm seed --review --themes=... --providers=cloudflare-sdxl`).
 *
 * Each lane's `run()` is injected (the real one, wired in `index.ts`, spawns
 * the existing command unchanged rather than reimplementing it) so this stays
 * testable with stub promises and no child process. `runLanes` always waits
 * for every lane and never lets one lane's failure or rejection stop or skip
 * another — the same "report per lane, keep going" shape `runBakeOff` already
 * uses for its provider lanes.
 */

export interface LaneOutcome {
  id: string;
  ok: boolean;
  detail: string;
}

export interface LaneSpec {
  id: string;
  run: () => Promise<LaneOutcome>;
}

/** Runs every lane concurrently; a throwing or rejecting lane is reported, not propagated. */
export async function runLanes(lanes: readonly LaneSpec[]): Promise<LaneOutcome[]> {
  const settled = await Promise.allSettled(lanes.map((lane) => lane.run()));
  return settled.map((result, i) =>
    result.status === "fulfilled"
      ? result.value
      : {
          id: lanes[i]!.id,
          ok: false,
          detail: result.reason instanceof Error ? result.reason.message : String(result.reason),
        },
  );
}
