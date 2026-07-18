"use client";

import { useState, useTransition } from "react";
import { unlockAdminAction } from "./unlock-action";
import { ErrorBanner } from "@/features/ui/ErrorBanner";

/** Passcode entry for the admin gate (U4-FR1). Generic error on failure. */
export function UnlockForm() {
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(false);
    startTransition(async () => {
      const ok = await unlockAdminAction(formData);
      // On success the action redirects; reaching here means it failed.
      if (ok === false) setError(true);
    });
  }

  return (
    <form
      action={onSubmit}
      className="panel flex w-full max-w-sm flex-col gap-4 p-8"
      data-testid="admin-unlock-form"
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="text-5xl" aria-hidden>
          🔒
        </div>
        <h1 className="text-2xl font-bold">Parent passcode</h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Enter the admin passcode to continue.
        </p>
      </div>

      <input
        name="passcode"
        type="password"
        autoComplete="off"
        autoFocus
        placeholder="Passcode"
        data-testid="admin-passcode-input"
        className="rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 text-center text-[color:var(--ink)] outline-none transition focus:border-[color:var(--brand-1)] focus:ring-2 focus:ring-[color:var(--brand-1)]/40"
      />

      <ErrorBanner
        testId="admin-passcode-error"
        message={error ? "Incorrect passcode." : null}
        className="text-center text-sm text-red-300"
      />

      <button
        type="submit"
        disabled={pending}
        data-testid="admin-unlock-button"
        className="btn btn--primary"
      >
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
