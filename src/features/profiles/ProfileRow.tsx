"use client";

import { useState } from "react";
import { AvatarBadge } from "@/features/ui/AvatarBadge";
import { ProfileForm } from "./ProfileForm";
import { ArchiveProfileButton } from "./ArchiveProfileButton";

/**
 * Admin Manage-Profiles row (FR3). Read view with Edit + Archive; Edit toggles an
 * inline ProfileForm (reuses updateProfileAction) to change name/icon. Archived
 * profiles are listed separately by ArchivedProfileRow (#97).
 */
export function ProfileRow({
  id,
  name,
  avatar,
  pullTokens,
  easterEggTickets = 0,
  ownedCount,
}: {
  id: string;
  name: string;
  avatar: string;
  pullTokens: number;
  easterEggTickets?: number;
  /** Distinct cards this child owns — shown in the archive confirmation (Inc23 FR9). */
  ownedCount: number;
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
        <AvatarBadge avatar={avatar} className="h-11 w-11 text-xl" />
        <span className="display font-semibold">{name}</span>
        <span
          className="pill text-xs"
          data-testid={`profile-tickets-${id}`}
        >
          🎟️ {pullTokens} · 🥚 {easterEggTickets}
        </span>
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
        <ArchiveProfileButton id={id} name={name} ownedCount={ownedCount} />
      </span>
    </li>
  );
}
