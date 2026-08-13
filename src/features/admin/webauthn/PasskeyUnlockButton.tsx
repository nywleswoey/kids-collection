"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { ErrorBanner } from "@/features/ui/ErrorBanner";
import {
  beginPasskeyUnlockAction,
  finishPasskeyUnlockAction,
  type PasskeyFailure,
} from "./passkey-actions";

/** Wording is deliberately generic — a failed unlock never says why in detail. */
const MESSAGES: Record<PasskeyFailure, string> = {
  unavailable: "Passkeys aren't available on this address.",
  "none-enrolled": "No passkey is set up yet.",
  expired: "That took too long — try again.",
  rejected: "Couldn't verify that passkey.",
  duplicate: "That passkey is already set up.",
};

/**
 * Passkey unlock for the admin gate (parent-gate-auth). Runs the WebAuthn
 * ceremony, then lets the server issue the same signed gate cookie the passcode
 * used to. Nothing here is observable by someone watching the screen.
 */
export function PasskeyUnlockButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function unlock() {
    setError(null);
    startTransition(async () => {
      const begun = await beginPasskeyUnlockAction();
      if (!begun.ok) {
        setError(MESSAGES[begun.reason]);
        return;
      }

      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: begun.options });
      } catch {
        // Cancelled at the OS/password-manager prompt, or no matching credential.
        setError("Passkey cancelled.");
        return;
      }

      const finished = await finishPasskeyUnlockAction(assertion, begun.token);
      if (!finished.ok) {
        setError(MESSAGES[finished.reason]);
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={unlock}
        disabled={pending}
        data-testid="admin-passkey-button"
        className="btn btn--primary"
      >
        {pending ? "Waiting for passkey…" : "Unlock with passkey"}
      </button>
      <ErrorBanner
        testId="admin-passkey-error"
        message={error}
        className="text-center text-sm text-red-300"
      />
    </div>
  );
}
