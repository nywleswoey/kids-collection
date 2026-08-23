import { z } from "zod";
import type { ProfileStore } from "@/db/stores/profile-store";
import { toChild } from "./child-mapper";
import { AVATAR_KEYS } from "@/lib/avatars";
import type { Child } from "@/lib/types";

/**
 * A child plus the moment they were archived (#97). Deliberately NOT a field on
 * `Child`: no gameplay surface should be able to ask whether a player is
 * archived, because no gameplay surface can reach one. Archived-ness exists only
 * on the parent's undo screen, so it lives only in the shape that screen reads.
 */
export interface ArchivedProfile extends Child {
  archivedAt: Date;
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  avatar: z.enum(AVATAR_KEYS as [string, ...string[]]),
});

export interface ProfileDeps {
  profiles: ProfileStore;
}

/**
 * Child-profile service, parameterized by its ProfileStore port. Owns input
 * validation + row→domain mapping; parent gating now lives at the action layer
 * (create/update/remove run inside `withParent`). Prod wiring: `service.prod.ts`.
 */
export function makeProfileService({ profiles }: ProfileDeps) {
  /** All child profiles, ordered case-insensitively by name (Inc8 FR4). */
  async function listChildren(): Promise<Child[]> {
    return (await profiles.list()).map(toChild);
  }

  /** Single child profile, or null. */
  async function getChild(id: string): Promise<Child | null> {
    const row = await profiles.find(id);
    return row ? toChild(row) : null;
  }

  async function createChild(input: { name: string; avatar: string }): Promise<Child> {
    const data = profileSchema.parse(input);
    return toChild(await profiles.create(data));
  }

  async function updateChild(
    id: string,
    input: { name: string; avatar: string },
  ): Promise<Child> {
    const data = profileSchema.parse(input);
    const row = await profiles.update(id, data);
    if (!row) throw new Error("updateChild: not found");
    return toChild(row);
  }

  /**
   * Archive a child (#97). Reversible by `restoreChild`, and it deletes nothing:
   * the profile drops out of `listChildren`, `getChild`, the trade board, the
   * admin overview and the active-profile cookie check, while every collection,
   * quiz and reward row it owns stays exactly where it is.
   */
  async function archiveChild(id: string): Promise<void> {
    await profiles.archive(id);
  }

  /** Undo an archive — the whole reason the stamp is a timestamp and not a DELETE. */
  async function restoreChild(id: string): Promise<void> {
    await profiles.restore(id);
  }

  /** The archived profiles, for the parent's restore screen. The only read in the
   *  app that sees them. */
  async function listArchivedProfiles(): Promise<ArchivedProfile[]> {
    return (await profiles.listArchived()).map((row) => ({
      ...toChild(row),
      archivedAt: row.archivedAt,
    }));
  }

  return {
    listChildren,
    getChild,
    createChild,
    updateChild,
    archiveChild,
    restoreChild,
    listArchivedProfiles,
  };
}

export type ProfileService = ReturnType<typeof makeProfileService>;
