import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Server-only Drizzle client over Neon. Connection reused across invocations
 * (Fluid Compute). All persistence goes through this — never query from the client.
 */
const sql = neon(env.databaseUrl);

/** Drizzle database client instance (server-only). */
export const db = drizzle(sql, { schema });

export { schema };
