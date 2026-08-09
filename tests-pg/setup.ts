import { neonConfig } from "@neondatabase/serverless";

/**
 * Point the neon-http driver at the local proxy (docker: postgres + neon HTTP
 * proxy) BEFORE any test module imports `@/db` and constructs the client. See
 * the pg-contract compose file; ports match its published mappings.
 */
neonConfig.fetchEndpoint = "http://localhost:4499/sql";
neonConfig.useSecureWebSocket = false;
neonConfig.poolQueryViaFetch = true;

process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5499/main";
process.env.AUTH_SECRET ??= "test-secret-key";

// No `fc.configureGlobal` here, deliberately: this suite runs NO properties.
// Every `it.runIf(properties)` in the shared contracts is switched off by the
// `{ properties: false }` each tests-pg entry point passes, which is the whole
// of the "47 passed | 3 skipped" — so nothing in this run reaches `fc.assert`
// and a numRuns set here would configure nothing. It previously did, and read
// as though the pg suite were fuzzing at a low count.
//
// If properties are ever switched on for the pg adapters, set a LOW count here
// rather than inheriting: each run truncates and reseeds a real database over
// HTTP, so the round-trips, not the search, are the cost. Depth for the suite
// that actually fuzzes lives in tests/setup.ts, via FC_NUM_RUNS.
