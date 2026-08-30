"use client";

import { useState } from "react";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { TEXT_INPUT_CLASS } from "@/features/ui/styles";
import { createProfileAction, updateProfileAction } from "./actions";

/**
 * Profile creation/edit form. Handles both new profile creation and editing
 * existing profiles. Includes name input and avatar picker. Validates name
 * presence before submit.
 */
export function ProfileForm({
  initial,
  onDone,
}: {
  initial?: { id: string; name: string; avatar: string };
  /** Fired on submit — lets an inline editor collapse back to the read row (FR3). */
  onDone?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATAR_PRESETS[0].key);
  const valid = name.trim().length > 0;
  const action = initial ? updateProfileAction : createProfileAction;

  return (
    <form
      action={action}
      onSubmit={() => onDone?.()}
      className="panel flex flex-col gap-4 p-5"
      data-testid="profile-form"
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        data-testid="profile-name-input"
        className={TEXT_INPUT_CLASS}
      />

      <input type="hidden" name="avatar" value={avatar} />
      <div className="flex flex-wrap gap-2">
        {AVATAR_PRESETS.map((a) => (
          <button
            type="button"
            key={a.key}
            onClick={() => setAvatar(a.key)}
            data-testid={`avatar-option-${a.key}`}
            aria-pressed={avatar === a.key}
            className={`rounded-xl px-2.5 py-1.5 text-2xl transition ${
              avatar === a.key
                ? "scale-110 bg-white/25 ring-2 ring-[color:var(--brand-1)]"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {a.emoji}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={!valid}
        data-testid="profile-save-button"
        className="btn btn--primary"
      >
        {initial ? "Save" : "Add profile"}
      </button>
    </form>
  );
}
