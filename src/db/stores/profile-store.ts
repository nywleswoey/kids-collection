import type { ChildRow } from "@/db/schema";

/** A child row known to be archived. `archivedAt` is non-null as a TYPE fact, so
 *  no caller has to assert it: only `listArchived` produces these, and its
 *  `archived_at IS NOT NULL` predicate is what makes the narrowing true. */
export type ArchivedChildRow = ChildRow & { archivedAt: Date };

/** The mutable fields of a child profile (name + avatar); balances are managed
 *  separately by ChildStore. */
export interface ProfileInput {
  name: string;
  avatar: string;
}

/**
 * ProfileStore — the persistence port for child profile rows (`children` table
 * at row granularity: list / find / create / update / archive / restore).
 * Complements ChildStore, which owns the atomic spendable-column operations on
 * the same table. Services accept this instead of the `db` singleton so their
 * orchestration (validation, mapping, aggregation) is unit-testable.
 *
 * There is deliberately NO hard delete (#97). A `DELETE FROM children` cascades
 * into `collections`, `quiz_completions`, `quiz_seen_questions` and
 * `collection_rewards` — every card the child has ever pulled — and the port is
 * where that stops being reachable. Archiving is the whole vocabulary the app
 * has for "remove this profile", and it is reversible.
 *
 * The split that makes that safe is between `list`/`find`, which see only ACTIVE
 * children and are what every parent- and child-facing surface goes through, and
 * `listArchived`, which exists solely so a parent can undo.
 *
 * Two adapters: `pgProfileStore` (prod) and `inMemoryProfileStore` (tests).
 */
export interface ProfileStore {
  /** Active child rows, ordered case-insensitively by name (stable — a balance
   *  UPDATE must not reshuffle the list). Archived children are excluded. */
  list(): Promise<ChildRow[]>;

  /** Archived child rows, same ordering. The only read that sees them. */
  listArchived(): Promise<ArchivedChildRow[]>;

  /** One ACTIVE child row by id, or null. An archived child reads as absent —
   *  that is what makes a stale `activeChildId` cookie stop working. */
  find(id: string): Promise<ChildRow | null>;

  /** Insert a new child (balances default per schema, `archivedAt` null) and
   *  return the row. */
  create(data: ProfileInput): Promise<ChildRow>;

  /** Update an ACTIVE child's profile fields; returns the new row, or null if
   *  absent or archived — an archived profile cannot be edited, only restored.
   *  Note this covers the profile fields ONLY: the balance and collection ports
   *  carry no `archived_at` predicate, because they are reachable only with an id
   *  that came from an already-filtered read. */
  update(id: string, data: ProfileInput): Promise<ChildRow | null>;

  /** Stamp a child as archived, hiding them everywhere without deleting a single
   *  row. No-op for an unknown id; re-archiving does NOT move the stamp, because
   *  when a profile was archived is the fact a parent judges the undo by. */
  archive(id: string): Promise<void>;

  /** Clear the archive stamp, making the child active again. No-op for an
   *  unknown id or an already-active child. */
  restore(id: string): Promise<void>;
}
