import fc from "fast-check";

/**
 * Property-search depth for `pnpm test`, controlled by FC_NUM_RUNS.
 *
 * Unset — the local default — leaves fast-check on its own default of 100 cases
 * per property, which keeps the inner loop at a few seconds. CI sets it higher
 * (see .github/workflows/ci.yml): nobody is waiting on a runner, and a blocking
 * constraint deserves the deeper search where the deeper search is free.
 *
 * There is deliberately no `process.env.CI` branch. CI=true is set by every CI
 * system and by some local tooling, so a CI-sniffing default would silently
 * change what a developer's run means. An explicit variable, set in one visible
 * place, also means `FC_NUM_RUNS=1000 pnpm test` reproduces a CI failure exactly.
 *
 * A malformed value THROWS rather than falling back. `numRuns: NaN` makes
 * fast-check run each property zero times and report a pass — a suite that
 * claims 321 green while checking nothing, which is the precise failure this
 * repo's CI work exists to prevent. Better to fail the run loudly.
 */
const configured = process.env.FC_NUM_RUNS;

if (configured !== undefined && configured !== "") {
  const numRuns = Number(configured);

  if (!Number.isInteger(numRuns) || numRuns < 1) {
    throw new Error(
      `FC_NUM_RUNS must be a positive integer; got ${JSON.stringify(configured)}. ` +
        `Leave it unset for fast-check's default of 100.`,
    );
  }

  fc.configureGlobal({ numRuns });
}
