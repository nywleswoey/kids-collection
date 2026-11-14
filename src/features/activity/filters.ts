import { ACTIVITY_EVENT_TYPES, type ActivityEventType } from "./types";

/** Parses the activity page's `?childId=`/`?type=` query params — shared by
 *  the page (reading `searchParams`) and its tests. An absent, empty,
 *  array-valued (repeated key), or unrecognised value all fall back to "All"
 *  rather than erroring, since a bookmarked/typed URL is untrusted input. */

export function parseChildIdParam(raw: string | string[] | undefined): string | null {
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function parseEventTypeParam(raw: string | string[] | undefined): ActivityEventType | null {
  if (typeof raw !== "string") return null;
  return ACTIVITY_EVENT_TYPES.some((t) => t.type === raw) ? (raw as ActivityEventType) : null;
}
