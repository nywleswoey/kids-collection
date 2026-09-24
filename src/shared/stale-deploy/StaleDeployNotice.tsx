"use client";

import { useSyncExternalStore } from "react";
import { staleRecovery } from "./recovery";

/**
 * The brief "we updated" message shown while a stale page reloads (#169).
 * Written for a young child: cheerful, about the app, never about them. Uses
 * inline styles only, because `app/global-error.tsx` renders it without the
 * app's stylesheet.
 */
export function StaleDeployMessage() {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="stale-deploy-notice"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        textAlign: "center",
        padding: "1.5rem 2rem",
        borderRadius: "1.5rem",
        background: "#1b1245",
        color: "#fff",
        fontFamily: "sans-serif",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: "2.5rem" }} aria-hidden="true">
        ✨
      </div>
      <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
        The app just got better!
      </p>
      <p style={{ margin: 0, fontSize: "1.1rem" }}>One moment…</p>
    </div>
  );
}

/** Full-screen overlay for the normal layout; renders nothing until a reload starts. */
export function StaleDeployNotice() {
  const reloading = useSyncExternalStore(
    staleRecovery.subscribe,
    staleRecovery.isReloading,
    () => false,
  );
  if (!reloading) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(13,8,38,0.85)",
      }}
    >
      <StaleDeployMessage />
    </div>
  );
}
