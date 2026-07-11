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
        className="rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 text-[color:var(--ink)] outline-none transition focus:border-[color:var(--brand-1)] focus:ring-2 focus:ring-[color:var(--brand-1)]/40"
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
