import "server-only";
import { listThemes, listCards } from "@/features/pool/service";
import { buildCatalog } from "./catalog-model";
import type { BinderView } from "@/lib/types";

export { buildCatalog };

/** Load the pool and build the preview catalog (admin-only, U4-FR2). */
export async function getCatalogPreview(): Promise<BinderView> {
  const [themes, cards] = await Promise.all([listThemes(), listCards()]);
  return buildCatalog(themes, cards);
}
