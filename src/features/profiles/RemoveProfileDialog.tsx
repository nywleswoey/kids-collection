"use client";

import { useEffect, useRef, useState } from "react";
import { namesMatch } from "./confirm-name";

/**
 * Type-the-name confirmation before deleting a child profile (Inc23 FR9).
 *
 * Replaces a one-click `window.confirm`. Removing a profile cascades into
 * `collections`, `quiz_completions` and `collection_rewards` — every card that
 * child has ever pulled — so the confirmation shows the size of the loss and
 * requires a deliberate act rather than a reflex.
 *
 * This is additive friction only. `removeProfileAction` keeps its `withParent`
 * gating exactly as before; the dialog is not an authorization boundary.
 */
export function RemoveProfileDialog({
  name,
  ownedCount,
  onCancel,
  onConfirm,
}: {
  name: string;
  ownedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const canDelete = namesMatch(typed, name);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-profile-title"
      data-testid="remove-profile-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="panel flex w-full max-w-sm flex-col gap-4 p-5">
        <h2 id="remove-profile-title" className="text-lg font-bold">
          Remove {name}?
        </h2>

        <p className="text-sm text-[color:var(--ink-mute)]">
          This permanently deletes their collection —{" "}
          <strong className="text-[color:var(--ink)]">
            {ownedCount} different {ownedCount === 1 ? "card" : "cards"}
          </strong>
          , plus their tickets and quiz history. It cannot be undone.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span>
            Type <strong>{name}</strong> to confirm:
          </span>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            data-testid="remove-profile-input"
            autoComplete="off"
            className="rounded-lg bg-white/10 px-3 py-2 outline-none focus:bg-white/15"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            data-testid="remove-profile-cancel"
            className="btn btn--ghost text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            data-testid="remove-profile-confirm"
            className="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remove {name}
          </button>
        </div>
      </div>
    </div>
  );
}
