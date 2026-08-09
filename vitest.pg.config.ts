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
    // SCRATCH — matches ZERO files on purpose (#23). Worse here than on the
    // fast gate: the containers still come up, so the job LOOKS like it did
    // its work.
    include: ["tests-pg/**/*.no-such-suffix.pg.test.ts"],
    setupFiles: ["./tests-pg/setup.ts"],
    fileParallelism: false, // shared DB → run files serially
    testTimeout: 30_000,
  },
});
