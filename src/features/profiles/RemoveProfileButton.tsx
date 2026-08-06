"use client";

import { useRef, useState } from "react";
import { removeProfileAction } from "./actions";
import { RemoveProfileDialog } from "./RemoveProfileDialog";

/**
 * Remove a child profile. Opens a type-the-name confirmation (Inc23 FR9) showing
 * how many cards are about to be destroyed — a deliberate act, where the previous
 * `window.confirm` was one misclick away from wiping a collection.
 * Warns that the child's collection is deleted (U2-BR7).
 */
export function RemoveProfileButton({
  id,
  name,
  ownedCount,
}: {
  id: string;
  name: string;
  ownedCount: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <form ref={formRef} action={removeProfileAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        data-testid={`profile-remove-${id}`}
        onClick={() => setConfirming(true)}
        className="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/30"
      >
        Remove
      </button>

      {confirming ? (
        <RemoveProfileDialog
          name={name}
          ownedCount={ownedCount}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            formRef.current?.requestSubmit();
          }}
        />
      ) : null}
    </form>
  );
}
