import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Server-only Drizzle client over Neon. Connection reused across invocations
 * (Fluid Compute). All persistence goes through this — never query from the client.
 *
 * Built lazily on first use: reading `env.databaseUrl` at module load would force
 * `DATABASE_URL` to be present at *build* time (Next collects page data by importing
 * the module graph), even though every query only runs at request time. The proxy
 * defers construction to the first real access so `next build` needs no DB secret.
 */
type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let client: DbClient | undefined;

function getDb(): DbClient {
  if (!client) {
    client = drizzle(neon(env.databaseUrl), { schema });
  }
  return client;
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as DbClient;

export { schema };
