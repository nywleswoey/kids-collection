import { requireParent } from "@/features/auth/guard";
import { reauthForEnrolAction } from "@/features/admin/webauthn/reauth-action";

/**
 * Re-authentication step before passkey enrolment (parent-gate-auth).
 *
 * Uses `requireParent`, never `requireFreshParent` — this page is where a stale
 * session is sent, so demanding freshness here would loop.
 */
export default async function AdminEnrolReauthPage() {
  await requireParent();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-8"
      data-testid="admin-reauth-page"
    >
      <div className="panel flex w-full max-w-sm flex-col gap-5 p-8 text-center">
        <div className="text-5xl" aria-hidden>
          🛡️
        </div>
        <h1 className="text-2xl font-bold">Confirm it&apos;s you</h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Setting up a passkey creates a lasting key to the admin area, so we ask
          Google to check it&apos;s really you first — not just that this device is
          signed in.
        </p>
        <form action={reauthForEnrolAction}>
          <button
            type="submit"
            className="btn btn--primary w-full"
            data-testid="admin-reauth-button"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
