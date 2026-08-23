import { neon } from "@neondatabase/serverless";
import { pgProfileStore } from "@/db/stores/profile-store.pg";
import { runProfileStoreContract } from "../tests/contracts/profile-store-contract";
import { resetAll } from "./db";

const sql = neon(process.env.DATABASE_URL!);

// Same contract as the fake, against the real pg adapter. Seed via the store's
// own create() — ids are DB-generated; the contract never asserts a specific id.
//
// `create` only takes ProfileInput (ChildStore owns the balances, and `archivedAt`
// is set by archive()), so every OTHER column ProfileSeed advertises is applied
// with a follow-up UPDATE. Skipping any of them would make a contract case that
// seeds it vacuous here while passing against the fake — precisely the divergence
// the dual-adapter suite exists to catch.
runProfileStoreContract("pg adapter", async (seed = []) => {
  await resetAll();
  for (const r of seed) {
    const row = await pgProfileStore.create({ name: r.name, avatar: r.avatar });
    await sql`UPDATE children
                 SET pull_tokens = ${r.pullTokens ?? 3},
                     easter_egg_tickets = ${r.easterEggTickets ?? 0},
                     archived_at = ${r.archivedAt ?? null}
               WHERE id = ${row.id}`;
  }
  return pgProfileStore;
});
