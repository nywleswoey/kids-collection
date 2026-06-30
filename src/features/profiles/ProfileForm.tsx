"use client";

import { useState } from "react";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { createProfileAction, updateProfileAction } from "./actions";

export function ProfileForm({
  initial,
}: {
  initial?: { id: string; name: string; avatar: string };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATAR_PRESETS[0].key);
  const valid = name.trim().length > 0;
  const action = initial ? updateProfileAction : createProfileAction;

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4"
      data-testid="profile-form"
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        data-testid="profile-name-input"
        className="rounded-lg bg-white/10 px-3 py-2"
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
            className={`rounded-lg px-2 py-1 text-2xl transition ${
              avatar === a.key ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
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
        className="rounded-lg bg-white px-4 py-2 font-semibold text-gray-900 disabled:opacity-40"
      >
        {initial ? "Save" : "Add profile"}
      </button>
    </form>
  );
}
