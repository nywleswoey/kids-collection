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

/**
 * Fire-and-flush a parent-attributed PostHog event. Three actions here repeated
 * the same resolve-parent / get-client / capture / flush dance and differed only
 * in the event name. `selectProfileAction` keeps its own copy: it resolves the
 * parent first for the surrounding catch, so sharing this would mean resolving
 * twice.
 */
async function captureParentEvent(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const parent = await getParent();
  if (!parent) return;
  const posthog = getPostHogClient();
  if (!posthog) return;
  posthog.capture({ distinctId: parent.id, event, properties });
  await posthog.flush();
}

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
  await captureParentEvent("profile_created", { avatar });
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

/**
 * Archive a child profile (#97). Named for what it now does: nothing is deleted,
 * and `restoreProfileAction` is the undo. Keeps the same `withParent` gating and
 * the same revalidated paths as the delete it replaced.
 *
 * The PostHog event was renamed with it: `profile_removed` → `profile_archived`.
 * Deliberate, because the old name would now describe an event that no longer
 * happens — but it does mean any saved funnel or insight on `profile_removed`
 * stops receiving data rather than quietly changing meaning.
 */
export async function archiveProfileAction(formData: FormData): Promise<void> {
  await withParent(
    () => profileService.archiveChild(field(formData, "id")),
    PROFILE_PATHS,
    "archive_profile",
  );
  await captureParentEvent("profile_archived");
}

/** Undo an archive, putting the profile back in every list it left. */
export async function restoreProfileAction(formData: FormData): Promise<void> {
  await withParent(
    () => profileService.restoreChild(field(formData, "id")),
    PROFILE_PATHS,
    "restore_profile",
  );
  await captureParentEvent("profile_restored");
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
