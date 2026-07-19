import "server-only";
import { listCards, getCard, listThemes } from "./service";
import type { Catalog } from "./catalog";

/** Postgres adapter for the Catalog port — the existing pool reads. */
export const pgCatalog: Catalog = { listCards, getCard, listThemes };
