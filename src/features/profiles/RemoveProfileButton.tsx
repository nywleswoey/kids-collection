"use client";

import { useRef } from "react";
import { removeProfileAction } from "./actions";

/**
 * Remove with a native confirm (avoids blocking dialog issues; simple + safe).
 * Warns that the child's collection is deleted (U2-BR7).
 */
export function RemoveProfileButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={removeProfileAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        data-testid={`profile-remove-${id}`}
        onClick={() => {
          if (
            window.confirm(
              `Remove ${name}? This permanently deletes their card collection.`,
            )
          ) {
            formRef.current?.requestSubmit();
          }
        }}
        className="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/30"
      >
        Remove
      </button>
    </form>
  );
}
