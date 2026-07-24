import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (!key) {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
    );
  }
} else {
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    // Session replay is scoped to the child play area only (see
    // app/play/layout.tsx). It stays OFF by default here so parent/admin
    // pages are never recorded; the play layout starts/stops it on mount.
    // Inputs are masked to keep parent passcodes and any typed text out of
    // recordings (this is a kids app).
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      recordCrossOriginIframes: false,
    },
    debug: process.env.NODE_ENV === "development",
  });
}
