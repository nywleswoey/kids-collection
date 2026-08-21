import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // ⚠️ `--passWithNoTests` must NEVER be added — not here as
    // `passWithNoTests: true`, and not to the `test`, `test:pg` or
    // `test:providers` scripts in package.json. Vitest's default is to FAIL a
    // run that matches no files, and that default is load-bearing rather than
    // incidental: #23 broke every gate on purpose to prove the harness honest,
    // and one of the six breakages was pointing an `include` glob at a dead
    // suffix, which duly reddened the check with `No test files found`. With
    // the flag set, that same run goes green having executed nothing.
    //
    // This is not a hypothetical failure mode. `numRuns: NaN` already produced
    // 321 passing tests that checked nothing — fast-check ran each property
    // zero times and reported a pass — which is why tests/setup.ts now throws
    // on a malformed FC_NUM_RUNS rather than falling back to a default.
    //
    // A suite that passes while running nothing is indistinguishable from a
    // real green, and it is strictly worse than having no CI: it converts
    // "nobody checked" into "something checked", which is a claim someone will
    // rely on. That is the failure #23 and #25 exist to prevent.
    include: ["tests/**/*.test.ts"],
    // Property-search depth only; see tests/setup.ts. Nothing here needs a
    // database — that is vitest.pg.config.ts's job.
    setupFiles: ["./tests/setup.ts"],
  },
});
