'use client';

import posthog from 'posthog-js';
import { startTransition } from 'react';
import { signOutAction } from '@/features/profiles/actions';

/**
 * Sign-out button that clears PostHog identity and triggers the sign-out action.
 * Calls `posthog.reset()` before signing out to end the identified session.
 */
export function SignOutButton() {
  function handleClick() {
    posthog.reset();
    // Awaited so a failure reaches the error boundary instead of vanishing as an
    // unhandled rejection (a stale page's Sign out did nothing at all).
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="sign-out-button"
      className="btn btn--ghost"
    >
      Sign out
    </button>
  );
}
