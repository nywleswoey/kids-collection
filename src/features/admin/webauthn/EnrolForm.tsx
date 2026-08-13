"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { ErrorBanner } from "@/features/ui/ErrorBanner";
import { TEXT_INPUT_CLASS } from "@/features/ui/styles";
import type { PasskeySummary } from "./availability";
import {
  beginPasskeyEnrolAction,
  finishPasskeyEnrolAction,
  removePasskeyAction,
  type EnrolTarget,
  type PasskeyFailure,
} from "./passkey-actions";

const MESSAGES: Record<PasskeyFailure, string> = {
  unavailable: "Passkeys aren't available on this address.",
  "none-enrolled": "No passkey is set up yet.",
  expired: "That took too long — try again.",
  rejected: "Couldn't set up that passkey.",
  duplicate: "That passkey is already set up on this account.",
};

const DEFAULT_LABELS: Record<EnrolTarget, string> = {
  platform: "This device",
  any: "1Password",
};

/**
 * Enrol and manage admin gate passkeys (parent-gate-auth). Reached only with a
 * fresh Google re-authentication — the server enforces that, not this component.
 *
 * The two enrol buttons are not a style preference. A password manager that keeps
 * its vault unlocked will authorise on one click; a platform authenticator asks
 * for a biometric every time (OQ-PG-4). Which one you enrol is the only control
 * the app has over that, which is also why removal lives here: a weaker
 * credential left enrolled stays offerable at the unlock prompt.
 */
export function EnrolForm({ credentials }: { credentials: PasskeySummary[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function enrol(target: EnrolTarget) {
    setError(null);
    startTransition(async () => {
      const begun = await beginPasskeyEnrolAction(target);
      if (!begun.ok) {
        setError(MESSAGES[begun.reason]);
        return;
      }

      let attestation;
      try {
        attestation = await startRegistration({ optionsJSON: begun.options });
      } catch {
        // Cancelled at the prompt, or the authenticator refused — often because
        // excludeCredentials matched something it already holds.
        setError("Passkey setup cancelled.");
        return;
      }

      const finished = await finishPasskeyEnrolAction(
        attestation,
        begun.token,
        label.trim() || DEFAULT_LABELS[target],
      );
      if (!finished.ok) {
        setError(MESSAGES[finished.reason]);
        return;
      }
      setDone(true);
      setLabel("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await removePasskeyAction(id);
      if (!result.ok) setError(MESSAGES[result.reason]);
      else router.refresh();
    });
  }

  return (
    <div className="panel flex w-full max-w-md flex-col gap-6 p-8" data-testid="admin-enrol-form">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="text-5xl" aria-hidden>
          🔑
        </div>
        <h1 className="text-2xl font-bold">Passkeys</h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Nothing is typed, so nobody watching can copy it.
        </p>
      </div>

      {credentials.length > 0 && (
        <ul className="flex flex-col gap-2" data-testid="admin-passkey-list">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.label}</p>
                <p className="text-xs text-[color:var(--ink-soft)]">
                  {c.lastUsedAt
                    ? `Last used ${new Date(c.lastUsedAt).toLocaleDateString()}`
                    : "Never used"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={pending}
                data-testid="admin-passkey-remove"
                className="btn btn--ghost shrink-0 text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-[color:var(--ink-soft)]">Name (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
            placeholder="e.g. MacBook Touch ID"
            data-testid="admin-enrol-label"
            className={TEXT_INPUT_CLASS}
          />
        </label>

        <button
          type="button"
          onClick={() => enrol("platform")}
          disabled={pending}
          data-testid="admin-enrol-platform"
          className="btn btn--primary"
        >
          {pending ? "Waiting…" : "Add this device (Touch ID / Windows Hello)"}
        </button>
        <p className="text-xs text-[color:var(--ink-soft)]">
          Asks for your fingerprint or face <strong>every time</strong> the gate opens.
        </p>

        <button
          type="button"
          onClick={() => enrol("any")}
          disabled={pending}
          data-testid="admin-enrol-any"
          className="btn btn--ghost"
        >
          Add a password manager or another device
        </button>
        <p className="text-xs text-[color:var(--ink-soft)]">
          Syncs everywhere, but if the vault is already unlocked it opens the gate on a
          single click.
        </p>
      </div>

      <ErrorBanner
        testId="admin-enrol-error"
        message={error}
        className="text-center text-sm text-red-300"
      />

      {done && (
        <p data-testid="admin-enrol-done" className="text-center text-sm text-green-300">
          Passkey added.
        </p>
      )}

      <button
        type="button"
        onClick={() => router.replace("/admin/unlock")}
        className="btn btn--ghost"
        data-testid="admin-enrol-continue"
      >
        Done
      </button>
    </div>
  );
}
