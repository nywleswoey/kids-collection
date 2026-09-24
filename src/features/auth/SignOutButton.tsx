'use client';

import posthog from 'posthog-js';
import { startTransition } from 'react';
import { signOutAction } from '@/features/profiles/actions';
import { recoverIfStale } from '@/shared/stale-deploy/recovery';

/**
 * Sign-out button that clears PostHog identity and triggers the sign-out action.
 * Calls `posthog.reset()` before signing out to end the identified session.
 */
export function SignOutButton() {
  function handleClick() {
    posthog.reset();
    // A standalone startTransition does not route rejections to an error
    // boundary, so a page from before a deploy recovers here; anything else
    // stays the unhandled rejection it always was, so it is still reported.
    startTransition(async () => {
      try {
        await signOutAction();
      } catch (e) {
        if (!recoverIfStale(e)) throw e;
      }
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
