/**
 * Strict argument parsing for `pnpm supergrok "<Theme Name>" [--auto | --auto-video]`.
 *
 * Follows the same `node:util parseArgs({ strict: true })` approach as
 * `scripts/seed/args.ts` rather than ad hoc `process.argv` checks.
 */
import { parseArgs as parseNodeArgs } from "node:util";

export class SupergrokArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupergrokArgsError";
  }
}

export interface SupergrokArgs {
  themeName: string;
  /** Drive the `grok` CLI instead of the clipboard/Downloads walk. */
  auto: boolean;
  /** Animate legendary cards' already-approved stills via `grok`'s `image_to_video` (data/kcanim report). */
  autoVideo: boolean;
}

const USAGE =
  'Usage: pnpm supergrok "<Theme Name>" [--auto | --auto-video]\n   The name must match seed-content/cards.json exactly.';

export function parseSupergrokArgs(argv: readonly string[]): SupergrokArgs {
  let values: Record<string, string | boolean | undefined>;
  let positionals: string[];
  try {
    ({ values, positionals } = parseNodeArgs({
      args: [...argv],
      options: {
        auto: { type: "boolean" },
        "auto-video": { type: "boolean" },
      },
      strict: true,
      allowPositionals: true,
    }));
  } catch (err) {
    throw new SupergrokArgsError(
      `unrecognized command line: ${err instanceof Error ? err.message : String(err)}\n${USAGE}`,
    );
  }

  const themeName = positionals[0];
  if (!themeName) {
    throw new SupergrokArgsError(USAGE);
  }
  if (positionals.length > 1) {
    throw new SupergrokArgsError(`unexpected extra argument(s): ${positionals.slice(1).join(", ")}\n${USAGE}`);
  }
  if (values.auto === true && values["auto-video"] === true) {
    throw new SupergrokArgsError(`--auto and --auto-video are mutually exclusive.\n${USAGE}`);
  }

  return { themeName, auto: values.auto === true, autoVideo: values["auto-video"] === true };
}
