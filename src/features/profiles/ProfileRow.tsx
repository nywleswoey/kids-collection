"use client";

import { useState } from "react";
import { avatarEmoji } from "@/lib/avatars";
import { ProfileForm } from "./ProfileForm";
import { RemoveProfileButton } from "./RemoveProfileButton";

/**
 * Admin Manage-Profiles row (FR3). Read view with Edit + Remove; Edit toggles an
 * inline ProfileForm (reuses updateProfileAction) to change name/icon.
 */
export function ProfileRow({
  id,
  name,
  avatar,
  pullTokens,
}: {
  id: string;
  name: string;
  avatar: string;
  pullTokens: number;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="flex flex-col gap-2" data-testid={`profile-row-${id}`}>
        <ProfileForm
          initial={{ id, name, avatar }}
          onDone={() => setEditing(false)}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          data-testid={`profile-edit-cancel-${id}`}
          className="btn btn--ghost self-start text-sm"
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li
      className="panel flex items-center justify-between p-3"
      data-testid={`profile-row-${id}`}
    >
      <span className="flex items-center gap-3">
        <span className="hero-avatar h-11 w-11 text-xl" aria-hidden>
          {avatarEmoji(avatar)}
        </span>
        <span className="display font-semibold">{name}</span>
        <span className="pill text-xs">🎟️ {pullTokens}</span>
      </span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid={`profile-edit-${id}`}
          className="rounded-lg bg-white/10 px-3 py-1 text-sm transition hover:bg-white/20"
        >
          Edit
        </button>
        <RemoveProfileButton id={id} name={name} />
      </span>
    </li>
  );
}
