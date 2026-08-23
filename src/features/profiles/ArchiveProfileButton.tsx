"use client";

import { useRef, useState } from "react";
import { archiveProfileAction } from "./actions";
import { ArchiveProfileDialog } from "./ArchiveProfileDialog";

/**
 * Archive a child profile (#97). Opens a type-the-name confirmation (Inc23 FR9)
 * showing how much is about to disappear from view — and saying that it is only
 * from view. The button is amber rather than red because the act is reversible:
 * the colour was carrying the same promise of permanence as the old copy.
 */
export function ArchiveProfileButton({
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
    <form ref={formRef} action={archiveProfileAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        data-testid={`profile-archive-${id}`}
        onClick={() => setConfirming(true)}
        className="rounded-lg bg-amber-500/20 px-3 py-1 text-sm text-amber-100 transition hover:bg-amber-500/30"
      >
        Archive
      </button>

      {confirming ? (
        <ArchiveProfileDialog
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
