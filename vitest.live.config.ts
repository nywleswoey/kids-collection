import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Live-provider runner: runs the shared ImageProvider contract against the REAL
 * endpoints (#67). Separate from the default config, and deliberately not in CI.
 *
 * The Store contracts get to run both sides in CI because a local Postgres is
 * free and deterministic. Image providers are neither: a live run in CI would
 * spend quota on every push, be flaky by construction on any queue-backed
 * provider, and sit directly against #68's "$0 stays $0 structurally".
 *
 * So this is the on-demand half. Run it when authoring an adapter, when a
 * provider starts misbehaving, or to check whether a provider has swapped its
 * model underneath you — which #64 showed happens with no announcement.
 *
 *   pnpm test:providers
 *
 * Needs the provider keys in .env.local; the run reports which providers it
 * skipped rather than passing silently on an empty set.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // ⚠️ Never add `--passWithNoTests`/`passWithNoTests: true` here either.
    // Not a CI gate, but the same lie: this runner's whole point is that it
    // reports what it skipped instead of passing on an empty set. Reasoning in
    // vitest.config.ts.
    include: ["tests-live/**/*.live.test.ts"],
    setupFiles: ["./tests-live/setup.ts"],
    // A single 768x768 generation can take 30s on a loaded free tier, and a
    // queue-backed provider can take considerably longer.
    testTimeout: 180_000,
    fileParallelism: false,
    retry: 0, // a flaky provider is a finding, not something to paper over
  },
});
