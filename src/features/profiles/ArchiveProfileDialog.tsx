"use client";

import { useEffect, useRef, useState } from "react";
import { namesMatch } from "./confirm-name";

/**
 * Type-the-name confirmation before archiving a child profile (Inc23 FR9, reworded
 * for #97).
 *
 * What this dialog promises changed when the action did. It used to say
 * "permanently deletes … cannot be undone", and that was true: removing a profile
 * cascaded into `collections`, `quiz_completions` and `collection_rewards`. Now
 * removing a profile stamps `children.archived_at` and deletes nothing, so the
 * copy says what actually happens and names the undo.
 *
 * The type-the-name step stays. Archiving is reversible, but it is not small — it
 * hides a child's whole collection and signs them out of the picker mid-play — so
 * it should still be a deliberate act rather than a reflex. What it is NOT any
 * more is a stand-in for a safety net, which is the criticism #97 opened with.
 *
 * This is additive friction only. `archiveProfileAction` keeps its `withParent`
 * gating exactly as before; the dialog is not an authorization boundary.
 */
export function ArchiveProfileDialog({
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
  const canArchive = namesMatch(typed, name);

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
      aria-labelledby="archive-profile-title"
      data-testid="archive-profile-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="panel flex w-full max-w-sm flex-col gap-4 p-5">
        <h2 id="archive-profile-title" className="text-lg font-bold">
          Archive {name}?
        </h2>

        <p className="text-sm text-[color:var(--ink-mute)]">
          {name} disappears from the player picker, the trade board and this list,
          along with their{" "}
          <strong className="text-[color:var(--ink)]">
            {ownedCount} different {ownedCount === 1 ? "card" : "cards"}
          </strong>
          , tickets and quiz history.{" "}
          <strong className="text-[color:var(--ink)]">Nothing is deleted</strong> — you
          can bring {name} back, exactly as they were, from Archived profiles.
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
            data-testid="archive-profile-input"
            autoComplete="off"
            className="rounded-lg bg-white/10 px-3 py-2 outline-none focus:bg-white/15"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            data-testid="archive-profile-cancel"
            className="btn btn--ghost text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canArchive}
            data-testid="archive-profile-confirm"
            className="rounded-lg bg-amber-500/20 px-3 py-1 text-sm text-amber-100 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Archive {name}
          </button>
        </div>
      </div>
    </div>
  );
}
