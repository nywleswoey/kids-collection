'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

interface Props {
  userId: string;
  email: string;
  name?: string | null;
}

export function PostHogIdentitySync({ userId, email, name }: Props) {
  useEffect(() => {
    posthog.identify(userId, {
      email,
      ...(name ? { name } : {}),
    });
  }, [userId]);

  return null;
}
