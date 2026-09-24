"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { isStaleDeploymentError, recoverIfStale } from "@/shared/stale-deploy/recovery";
import { StaleDeployMessage } from "@/shared/stale-deploy/StaleDeployNotice";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // A page loaded before a deploy (#169): recover by reloading, once. If a
  // reload was already tried, `recoverIfStale` says no and this falls through to
  // the ordinary error screen — a second failure must surface, not loop.
  const stale = isStaleDeploymentError(error);
  const [recoveryDeclined, setRecoveryDeclined] = useState(false);
  const recovering = stale && !recoveryDeclined;

  useEffect(() => {
    if (stale && recoverIfStale(error)) return;
    if (stale) setRecoveryDeclined(true);
    posthog.captureException(error);
  }, [error, stale]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          gap: "1rem",
        }}
      >
        {recovering ? (
          <StaleDeployMessage />
        ) : (
          <>
            <h2>Something went wrong</h2>
            <button onClick={reset}>Try again</button>
          </>
        )}
      </body>
    </html>
  );
}
