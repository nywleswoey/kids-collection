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
    include: ["tests/**/*.test.ts"],
    // Property-search depth only; see tests/setup.ts. Nothing here needs a
    // database — that is vitest.pg.config.ts's job.
    setupFiles: ["./tests/setup.ts"],
  },
});
