'use client';

import posthog from 'posthog-js';
import { startTransition } from 'react';
import { signOutAction } from '@/features/profiles/actions';

// posthog.reset() clears the identified session so the next anonymous visit starts fresh.
export function SignOutButton() {
  function handleClick() {
    posthog.reset();
    startTransition(() => {
      signOutAction();
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
