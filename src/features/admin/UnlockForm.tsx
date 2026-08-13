"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { unlockAdminAction } from "./unlock-action";
import { ErrorBanner } from "@/features/ui/ErrorBanner";
import { TEXT_INPUT_CLASS } from "@/features/ui/styles";
import { PasskeyUnlockButton } from "./webauthn/PasskeyUnlockButton";

/**
 * Admin gate unlock (U4-FR1). Passkey is the primary path; the passcode below it
 * is the CUTOVER FALLBACK ONLY.
 *
 * Deploy 2 of the parent-gate-auth cutover deletes the passcode half of this
 * component along with `verifyPasscode()` and `ADMIN_PASSCODE`. It ships in
 * deploy 1 purely so the passkey flow can be verified against production —
 * there is no staging environment and no browser E2E, so production is first
 * contact. See `Product-Definition/features/parent-gate-auth/`.
 */
export function UnlockForm({
  passkeyAvailable,
  passkeyEnrolled,
}: {
  passkeyAvailable: boolean;
  passkeyEnrolled: boolean;
}) {
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
    <div className="panel flex w-full max-w-sm flex-col gap-5 p-8">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="text-5xl" aria-hidden>
          🔒
        </div>
        <h1 className="text-2xl font-bold">Parent unlock</h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          {passkeyAvailable && passkeyEnrolled
            ? "Use your passkey to continue."
            : "Enter the admin passcode to continue."}
        </p>
      </div>

      {passkeyAvailable && passkeyEnrolled && <PasskeyUnlockButton />}

      {passkeyAvailable && !passkeyEnrolled && (
        <Link
          href="/admin/enrol"
          data-testid="admin-passkey-setup-link"
          className="btn btn--primary text-center"
        >
          Set up a passkey
        </Link>
      )}

      {passkeyAvailable && passkeyEnrolled && (
        // Reachable even once a passkey exists: adding a per-assertion-verifying
        // platform passkey, and removing a weaker one, both live behind this link.
        <Link
          href="/admin/enrol"
          data-testid="admin-passkey-manage-link"
          className="text-center text-xs text-[color:var(--ink-soft)] underline"
        >
          Manage passkeys
        </Link>
      )}

      <div className="flex items-center gap-3 text-xs text-[color:var(--ink-soft)]">
        <span className="h-px flex-1 bg-white/15" />
        <span>or use the passcode</span>
        <span className="h-px flex-1 bg-white/15" />
      </div>

      <form action={onSubmit} className="flex flex-col gap-4" data-testid="admin-unlock-form">
        <input
          name="passcode"
          type="password"
          autoComplete="off"
          placeholder="Passcode"
          data-testid="admin-passcode-input"
          className={`${TEXT_INPUT_CLASS} text-center`}
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
          className="btn btn--ghost"
        >
          {pending ? "Checking…" : "Unlock with passcode"}
        </button>
      </form>
    </div>
  );
}
