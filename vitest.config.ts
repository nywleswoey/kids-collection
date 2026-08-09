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
    // SCRATCH — matches ZERO files on purpose (#23). A gate that silently
    // matches nothing is the same lie as a gate that never ran.
    include: ["tests/**/*.no-such-suffix.test.ts"],
    // Property-search depth only; see tests/setup.ts. Nothing here needs a
    // database — that is vitest.pg.config.ts's job.
    setupFiles: ["./tests/setup.ts"],
  },
});
