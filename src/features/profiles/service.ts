import { z } from "zod";
import type { ProfileStore } from "@/db/stores/profile-store";
import { toChild } from "./child-mapper";
import { AVATAR_KEYS } from "@/lib/avatars";
import type { Child } from "@/lib/types";

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

  /** Remove a child; cascades to their collection entries (BR14). */
  async function removeChild(id: string): Promise<void> {
    await profiles.remove(id);
  }

  return { listChildren, getChild, createChild, updateChild, removeChild };
}

export type ProfileService = ReturnType<typeof makeProfileService>;
