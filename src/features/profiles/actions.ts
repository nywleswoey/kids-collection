"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut as authSignOut } from "@/auth/config";
import { requireParent } from "@/features/auth/guard";
import { field } from "@/lib/form";
import {
  createChild,
  updateChild,
  removeChild,
} from "./service";
import {
  setActiveProfile,
  clearActiveProfile,
} from "./active-profile";

/**
 * Run a parent-gated profile mutation, revalidating the admin profiles list
 * and the play picker. Shared body of the create/update/remove entry points.
 */
async function parentMutate(run: () => Promise<unknown>): Promise<void> {
  await requireParent();
  await run();
  revalidatePath("/admin/profiles");
  revalidatePath("/play");
}

/** Select a child profile, then go to the play home. */
export async function selectProfileAction(formData: FormData): Promise<void> {
  const childId = field(formData, "childId");
  await setActiveProfile(childId);
  redirect("/play/home");
}

/** Back to the picker (switch profile). */
export async function switchProfileAction(): Promise<void> {
  await clearActiveProfile();
  redirect("/play");
}

export async function createProfileAction(formData: FormData): Promise<void> {
  await parentMutate(() =>
    createChild({
      name: field(formData, "name"),
      avatar: field(formData, "avatar"),
    }),
  );
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  await parentMutate(() =>
    updateChild(field(formData, "id"), {
      name: field(formData, "name"),
      avatar: field(formData, "avatar"),
    }),
  );
}

export async function removeProfileAction(formData: FormData): Promise<void> {
  await parentMutate(() => removeChild(field(formData, "id")));
}

export async function signOutAction(): Promise<void> {
  await clearActiveProfile();
  await authSignOut({ redirectTo: "/signin" });
}
