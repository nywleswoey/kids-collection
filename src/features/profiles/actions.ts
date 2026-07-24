"use server";

import { redirect } from "next/navigation";
import { signOut as authSignOut } from "@/auth/config";
import { withParent } from "@/features/actions/action";
import { getParent } from "@/features/auth/guard";
import { field } from "@/lib/form";
import { captureServerException, getPostHogClient } from "@/lib/posthog-server";
import { profileService } from "./service.prod";
import {
  setActiveProfile,
  clearActiveProfile,
} from "./active-profile";

const PROFILE_PATHS = ["/admin/profiles", "/play"] as const;

/** Select a child profile, then go to the play home. */
export async function selectProfileAction(formData: FormData): Promise<void> {
  const parent = await getParent();
  try {
    const childId = field(formData, "childId");
    await setActiveProfile(childId);
    if (parent) {
      const posthog = getPostHogClient();
      if (posthog) {
        posthog.capture({ distinctId: parent.id, event: "profile_selected" });
        await posthog.flush();
      }
    }
  } catch (error) {
    await captureServerException(error, { distinctId: parent?.id, action: "select_profile" });
    throw error;
  }
  redirect("/play/home");
}

/** Back to the picker (switch profile). */
export async function switchProfileAction(): Promise<void> {
  const parent = await getParent();
  try {
    await clearActiveProfile();
  } catch (error) {
    await captureServerException(error, { distinctId: parent?.id, action: "switch_profile" });
    throw error;
  }
  redirect("/play");
}

export async function createProfileAction(formData: FormData): Promise<void> {
  const avatar = field(formData, "avatar");
  await withParent(
    () =>
      profileService.createChild({
        name: field(formData, "name"),
        avatar,
      }),
    PROFILE_PATHS,
    "create_profile",
  );
  const parent = await getParent();
  if (parent) {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "profile_created", properties: { avatar } });
      await posthog.flush();
    }
  }
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  await withParent(
    () =>
      profileService.updateChild(field(formData, "id"), {
        name: field(formData, "name"),
        avatar: field(formData, "avatar"),
      }),
    PROFILE_PATHS,
    "update_profile",
  );
}

export async function removeProfileAction(formData: FormData): Promise<void> {
  await withParent(() => profileService.removeChild(field(formData, "id")), PROFILE_PATHS, "remove_profile");
  const parent = await getParent();
  if (parent) {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: parent.id, event: "profile_removed" });
      await posthog.flush();
    }
  }
}

export async function signOutAction(): Promise<void> {
  const parent = await getParent();
  try {
    await clearActiveProfile();
    await authSignOut({ redirectTo: "/signin" });
  } catch (error) {
    await captureServerException(error, { distinctId: parent?.id, action: "sign_out" });
    throw error;
  }
}
