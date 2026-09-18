import { revalidatePath } from "next/cache";
import { requireParent } from "@/features/auth/guard";
import { requireActiveChild } from "@/features/profiles/active-profile";
import { captureServerException } from "@/lib/posthog-server";

/**
 * The one server-action shape: gate → run → revalidate. Every feature's actions
 * compose these instead of re-inventing the guard + `revalidatePath` dance, so
 * the gating and cache-busting policy lives in exactly one place.
 */

/** Paths to revalidate after an action — a fixed list, or one derived from the
 *  result (e.g. only on success). */
type Paths<T> = readonly string[] | ((result: T) => readonly string[]);

function revalidateAll<T>(paths: Paths<T> | undefined, result: T): void {
  const list = typeof paths === "function" ? paths(result) : (paths ?? []);
  for (const p of list) revalidatePath(p);
}

/**
 * Parent-gated action: enforce allowlisted-parent access, run the mutation, then
 * revalidate. The shape behind every parent-only action.
 */
export async function withParent<T>(
  run: () => Promise<T>,
  paths?: Paths<T>,
  label?: string,
): Promise<T> {
  const parent = await requireParent();
  try {
    const result = await run();
    revalidateAll(paths, result);
    return result;
  } catch (error) {
    await captureServerException(error, { distinctId: parent.id, action: label });
    throw error;
  }
}

/**
 * Active-child action: resolve the active child (throws if none — every `/play/*`
 * page already guarantees one), run with its id, then revalidate. Pass
 * `{ parent: true }` to also require an allowlisted parent (grants, sacrifice,
 * trade — a parent operating on the active child).
 */
export async function withActiveChild<T>(
  run: (childId: string) => Promise<T>,
  paths?: Paths<T>,
  opts?: { parent?: boolean; label?: string },
): Promise<T> {
  if (opts?.parent) await requireParent();
  const child = await requireActiveChild();
  try {
    const result = await run(child.id);
    revalidateAll(paths, result);
    return result;
  } catch (error) {
    await captureServerException(error, { distinctId: child.id, action: opts?.label });
    throw error;
  }
}
