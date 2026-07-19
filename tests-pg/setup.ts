import { neonConfig } from "@neondatabase/serverless";
import fc from "fast-check";

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

// Each property run truncates + reseeds a real DB over HTTP — keep the count
// modest so the round-trips stay quick.
fc.configureGlobal({ numRuns: 10 });
