import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
      );
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

/**
 * Next.js implements `redirect()`/`notFound()` by throwing sentinel errors that
 * its own runtime catches to drive navigation — they are control flow, not
 * failures, and must never be reported as exceptions.
 */
function isNextControlFlowError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
  );
}

/**
 * Best-effort server-side exception report. Ties the error to the acting user
 * (`distinctId`) and the originating action so a failure is legible in PostHog
 * instead of showing up only as the absence of a success event. Skips Next's
 * redirect/notFound control-flow signals and never throws itself, so it can't
 * mask the original error — the caller is expected to re-throw.
 *
 * posthog-node 3.x has no `captureException` helper (added in v4), so we emit the
 * `$exception` event by hand in the shape PostHog Error Tracking ingests: it
 * groups by `$exception_list` type/value and shows the raw server stack on the
 * event.
 */
export async function captureServerException(
  error: unknown,
  context: { distinctId?: string; action?: string },
): Promise<void> {
  if (isNextControlFlowError(error)) return;
  const posthog = getPostHogClient();
  if (!posthog) return;

  const err = error instanceof Error ? error : new Error(String(error));
  try {
    posthog.capture({
      distinctId: context.distinctId ?? "server",
      event: "$exception",
      properties: {
        action: context.action,
        $exception_message: err.message,
        $exception_type: err.name,
        $exception_stack_trace_raw: err.stack,
        $exception_list: [
          {
            type: err.name,
            value: err.message,
            mechanism: { handled: false, synthetic: false },
            stacktrace: { type: "raw", frames: [] },
          },
        ],
      },
    });
    await posthog.flush();
  } catch {
    // Analytics must never break a request; swallow reporting failures.
  }
}
