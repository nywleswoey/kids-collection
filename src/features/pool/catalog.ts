import type { Card, Theme } from "@/lib/types";

/**
 * Catalog — the read-only port over the static card pool. Injected like a Store
 * so services that draw/trade against the pool stay testable (the pg reads live
 * in `catalog.pg.ts`, the only `server-only` side).
 */
export interface Catalog {
  listCards(themeId?: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  listThemes(): Promise<Theme[]>;
}
