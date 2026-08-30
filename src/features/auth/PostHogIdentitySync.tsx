'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

interface Props {
  userId: string;
  email: string;
  name?: string | null;
}

/**
 * Syncs authenticated user identity to PostHog. Calls `posthog.identify` on
 * mount with user ID and profile data. Renders nothing (effect-only component).
 */
export function PostHogIdentitySync({ userId, email, name }: Props) {
  useEffect(() => {
    posthog.identify(userId, {
      email,
      ...(name ? { name } : {}),
    });
  }, [userId]);

  return null;
}
