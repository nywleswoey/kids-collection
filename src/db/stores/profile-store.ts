import type { ChildRow } from "@/db/schema";

/** The mutable fields of a child profile (name + avatar); balances are managed
 *  separately by ChildStore. */
export interface ProfileInput {
  name: string;
  avatar: string;
}

/**
 * ProfileStore — the persistence port for child profile rows (`children` table
 * at row granularity: list / find / create / update / remove). Complements
 * ChildStore, which owns the atomic spendable-column operations on the same
 * table. Services accept this instead of the `db` singleton so their orchestration
 * (validation, mapping, aggregation) is unit-testable.
 *
 * Two adapters: `pgProfileStore` (prod) and `inMemoryProfileStore` (tests).
 */
export interface ProfileStore {
  /** All child rows, ordered case-insensitively by name (stable — a balance
   *  UPDATE must not reshuffle the list). */
  list(): Promise<ChildRow[]>;

  /** One child row by id, or null. */
  find(id: string): Promise<ChildRow | null>;

  /** Insert a new child (balances default per schema) and return the row. */
  create(data: ProfileInput): Promise<ChildRow>;

  /** Update a child's profile fields; returns the new row, or null if absent. */
  update(id: string, data: ProfileInput): Promise<ChildRow | null>;

  /** Delete a child; cascades to their collection entries (BR14). */
  remove(id: string): Promise<void>;
}
