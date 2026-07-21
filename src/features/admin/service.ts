import type { ProfileStore } from "@/db/stores/profile-store";
import type { CollectionStore } from "@/db/stores/collection-store";
import type { Catalog } from "@/features/pool/catalog";
import { toChild } from "@/features/profiles/child-mapper";
import type { AdminOverview, AdminChildRow } from "@/lib/types";

export interface AdminDeps {
  profiles: ProfileStore;
  collections: CollectionStore;
  catalog: Catalog;
}

/**
 * Parent-oversight read model, parameterized by its ports. Aggregates each
 * child's balances + distinct-owned count against the pool totals. Parent gating
 * is the page's responsibility (admin/page.tsx, behind the admin gate). Prod
 * wiring: `service.prod.ts`.
 */
export function makeAdminService({ profiles, collections, catalog }: AdminDeps) {
  async function getAdminOverview(): Promise<AdminOverview> {
    const [kids, cards, themes] = await Promise.all([
      profiles.list(), // stable lower(name) order — no reshuffle after a grant
      catalog.listCards(),
      catalog.listThemes(),
    ]);
    const total = cards.length;

    const rows: AdminChildRow[] = await Promise.all(
      kids.map(async (c) => ({
        child: toChild(c),
        balance: c.pullTokens,
        epicTickets: c.epicTickets,
        luckyTickets: c.luckyTickets,
        owned: (await collections.ownedCardIds(c.id)).size,
        total,
      })),
    );

    return { children: rows, themes: themes.length, cards: total };
  }

  return { getAdminOverview };
}

export type AdminService = ReturnType<typeof makeAdminService>;
