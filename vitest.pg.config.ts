import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * pg-contract runner: runs the shared store contracts against the real pg
 * adapters over a local Postgres (docker: postgres + neon HTTP proxy). Separate
 * from the default vitest config so `pnpm test` needs no database. Bring the DB
 * up first, then `pnpm test:pg`. See tests-pg/setup.ts for the proxy wiring.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The pg adapters are `server-only` in prod; stub the guard for Node.
      "server-only": fileURLToPath(new URL("./tests-pg/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // ⚠️ Never add `--passWithNoTests`/`passWithNoTests: true` here either —
    // this glob backs a *required* check. Reasoning in vitest.config.ts.
    include: ["tests-pg/**/*.pg.test.ts"],
    setupFiles: ["./tests-pg/setup.ts"],
    fileParallelism: false, // shared DB → run files serially
    testTimeout: 30_000,
    // Same budget for hooks. `beforeEach` here does exactly the same work as a
    // test — a TRUNCATE plus a dozen seeding round trips over the HTTP proxy —
    // so giving it Vitest's 10s default while tests get 30s meant a slow machine
    // failed whole describe blocks in the seeding, with nothing wrong.
    hookTimeout: 30_000,
  },
});
