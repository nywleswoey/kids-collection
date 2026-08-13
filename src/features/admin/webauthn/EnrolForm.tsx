"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { ErrorBanner } from "@/features/ui/ErrorBanner";
import { TEXT_INPUT_CLASS } from "@/features/ui/styles";
import {
  beginPasskeyEnrolAction,
  finishPasskeyEnrolAction,
  type PasskeyFailure,
} from "./passkey-actions";

const MESSAGES: Record<PasskeyFailure, string> = {
  unavailable: "Passkeys aren't available on this address.",
  "none-enrolled": "No passkey is set up yet.",
  expired: "That took too long — try again.",
  rejected: "Couldn't set up that passkey.",
  duplicate: "That passkey is already set up on this account.",
};

/**
 * Enrol a passkey for the admin gate (parent-gate-auth). Reached only with a
 * fresh Google re-authentication — the server enforces that, not this component.
 */
export function EnrolForm({ hasExisting }: { hasExisting: boolean }) {
  const router = useRouter();
  const [label, setLabel] = useState("1Password");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function enrol() {
    setError(null);
    startTransition(async () => {
      const begun = await beginPasskeyEnrolAction();
      if (!begun.ok) {
        setError(MESSAGES[begun.reason]);
        return;
      }

      let attestation;
      try {
        attestation = await startRegistration({ optionsJSON: begun.options });
      } catch {
        // Cancelled at the prompt, or the authenticator refused (often because
        // excludeCredentials matched something it already holds).
        setError("Passkey setup cancelled.");
        return;
      }

      const finished = await finishPasskeyEnrolAction(attestation, begun.token, label);
      if (!finished.ok) {
        setError(MESSAGES[finished.reason]);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="panel flex w-full max-w-sm flex-col gap-4 p-8 text-center">
        <div className="text-5xl" aria-hidden>
          ✅
        </div>
        <h1 className="text-2xl font-bold">Passkey ready</h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          You can now unlock the admin area without typing anything.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/admin/unlock")}
          className="btn btn--primary"
          data-testid="admin-enrol-continue"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="panel flex w-full max-w-sm flex-col gap-5 p-8" data-testid="admin-enrol-form">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="text-5xl" aria-hidden>
          🔑
        </div>
        <h1 className="text-2xl font-bold">
          {hasExisting ? "Add another passkey" : "Set up a passkey"}
        </h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Your password manager or device will ask you to confirm. Nothing is typed,
          so nobody watching can copy it.
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="text-[color:var(--ink-soft)]">Name this passkey</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={40}
          data-testid="admin-enrol-label"
          className={TEXT_INPUT_CLASS}
        />
      </label>

      <button
        type="button"
        onClick={enrol}
        disabled={pending}
        data-testid="admin-enrol-button"
        className="btn btn--primary"
      >
        {pending ? "Waiting…" : "Create passkey"}
      </button>

      <ErrorBanner
        testId="admin-enrol-error"
        message={error}
        className="text-center text-sm text-red-300"
      />
    </div>
  );
}
