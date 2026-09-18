import type { BinderCard } from "@/lib/types";
import { LockedSlot } from "@/features/card/LockedSlot";
import { AdminCardSlot } from "./AdminCardSlot";

/**
 * `ThemeSection`'s per-card renderer for the admin pool preview: locked cards
 * get the same silhouette play uses, owned cards get the expandable admin
 * thumbnail. Composed here — in admin, not binder — so binder never needs to
 * know AdminCardSlot exists.
 */
export function AdminBinderSlot({ entry }: { entry: BinderCard }) {
  if (!entry.owned) return <LockedSlot entry={entry} />;
  return <AdminCardSlot entry={entry} />;
}
