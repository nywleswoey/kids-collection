"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut as authSignOut } from "@/auth/config";
import { requireParent } from "@/features/auth/guard";
import {
  createChild,
  updateChild,
  removeChild,
} from "./service";
import {
  setActiveProfile,
  clearActiveProfile,
} from "./active-profile";

/** Select a child profile, then go to the play home. */
export async function selectProfileAction(formData: FormData): Promise<void> {
  const childId = String(formData.get("childId") ?? "");
  await setActiveProfile(childId);
  redirect("/play/home");
}

/** Back to the picker (switch profile). */
export async function switchProfileAction(): Promise<void> {
  await clearActiveProfile();
  redirect("/play");
}

export async function createProfileAction(formData: FormData): Promise<void> {
  await requireParent();
  await createChild({
    name: String(formData.get("name") ?? ""),
    avatar: String(formData.get("avatar") ?? ""),
  });
  revalidatePath("/admin/profiles");
  revalidatePath("/play");
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  await requireParent();
  await updateChild(String(formData.get("id") ?? ""), {
    name: String(formData.get("name") ?? ""),
    avatar: String(formData.get("avatar") ?? ""),
  });
  revalidatePath("/admin/profiles");
  revalidatePath("/play");
}

export async function removeProfileAction(formData: FormData): Promise<void> {
  await requireParent();
  await removeChild(String(formData.get("id") ?? ""));
  revalidatePath("/admin/profiles");
  revalidatePath("/play");
}

export async function signOutAction(): Promise<void> {
  await clearActiveProfile();
  await authSignOut({ redirectTo: "/signin" });
}
