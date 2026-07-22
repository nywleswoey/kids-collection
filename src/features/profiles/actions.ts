"use server";

import { redirect } from "next/navigation";
import { signOut as authSignOut } from "@/auth/config";
import { withParent } from "@/features/actions/action";
import { field } from "@/lib/form";
import { profileService } from "./service.prod";
import {
  setActiveProfile,
  clearActiveProfile,
} from "./active-profile";

const PROFILE_PATHS = ["/admin/profiles", "/play"] as const;

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
  await withParent(
    () =>
      profileService.createChild({
        name: field(formData, "name"),
        avatar: field(formData, "avatar"),
      }),
    PROFILE_PATHS,
  );
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  await withParent(
    () =>
      profileService.updateChild(field(formData, "id"), {
        name: field(formData, "name"),
        avatar: field(formData, "avatar"),
      }),
    PROFILE_PATHS,
  );
}

export async function removeProfileAction(formData: FormData): Promise<void> {
  await withParent(() => profileService.removeChild(field(formData, "id")), PROFILE_PATHS);
}

export async function signOutAction(): Promise<void> {
  await clearActiveProfile();
  await authSignOut({ redirectTo: "/signin" });
}
