/**
 * Strict argument parsing for the seed CLI (A2).
 *
 * Before this, `main()` picked its mode with a chain of `process.argv.includes(...)`
 * checks, evaluated in a fixed order regardless of what else was on the
 * command line. That had three costs, all silent:
 *
 *   - A typo (`--sycn`) matched nothing and fell through to the `review`
 *     default, running a harmless-looking but wrong command.
 *   - Two mode flags together resolved by which `if` happened to run first —
 *     `--sync --check-urls` silently ran only `--check-urls`.
 *   - `--providers=` was read by `parseProvidersFlag` regardless of mode, so
 *     it was silently ignored on every command but `--review`.
 *
 * `parseSeedArgs` replaces all of that with `node:util`'s `parseArgs({ strict:
 * true })`: every flag must be one of the ones below, at most one command
 * flag may be present, and a modifier used with the wrong command is
 * rejected — by construction, not by remembering to check. The result is a
 * typed `Command` union so the rest of the CLI switches on `command.kind`
 * instead of re-reading argv.
 */
import { parseArgs as parseNodeArgs } from "node:util";

export type Command =
  | { kind: "check-images" }
  | { kind: "blob-budget" }
  | { kind: "check-urls" }
  | { kind: "supergrok-export" }
  | { kind: "review"; providers?: string[] }
  | { kind: "sync"; allowPrune: boolean };

/** Thrown by `parseSeedArgs` for an unknown, malformed, or conflicting flag. Never thrown after any write. */
export class SeedArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedArgsError";
  }
}

/** Every command a `Command["kind"]` can be — the flags that select one. */
const COMMAND_FLAGS = [
  "check-images",
  "blob-budget",
  "check-urls",
  "supergrok-export",
  "review",
  "sync",
] as const satisfies readonly Command["kind"][];

export function parseSeedArgs(argv: readonly string[]): Command {
  let values: Record<string, string | boolean | undefined>;
  try {
    ({ values } = parseNodeArgs({
      args: [...argv],
      options: {
        "check-images": { type: "boolean" },
        "blob-budget": { type: "boolean" },
        "check-urls": { type: "boolean" },
        "supergrok-export": { type: "boolean" },
        review: { type: "boolean" },
        sync: { type: "boolean" },
        "allow-prune": { type: "boolean" },
        providers: { type: "string" },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (err) {
    throw new SeedArgsError(
      `unrecognized command line: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const present = COMMAND_FLAGS.filter((f) => values[f] === true);
  if (present.length > 1) {
    throw new SeedArgsError(
      `--${present.join(" and --")} cannot be combined — pass exactly one command.`,
    );
  }
  const kind: Command["kind"] = present[0] ?? "review";

  if (values["allow-prune"] && kind !== "sync") {
    throw new SeedArgsError("--allow-prune is only valid with --sync.");
  }
  if (values.providers !== undefined && kind !== "review") {
    throw new SeedArgsError(
      "--providers is only valid with --review (or no command flag, which defaults to review).",
    );
  }

  switch (kind) {
    case "check-images":
    case "blob-budget":
    case "check-urls":
    case "supergrok-export":
      return { kind };
    case "review":
      return {
        kind: "review",
        providers:
          values.providers === undefined
            ? undefined
            : String(values.providers)
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
      };
    case "sync":
      return {
        kind: "sync",
        allowPrune: values["allow-prune"] === true,
      };
  }
}
