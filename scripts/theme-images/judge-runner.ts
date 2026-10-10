/**
 * Real `claude -p` invocation for the judge step, wrapped so
 * `src/shared/pool/judge.ts` stays spawn-free and testable — the same split
 * `scripts/supergrok-helper/index.ts` uses for `grok -p` (`runGrokHeadless` /
 * `grokCliAvailable`).
 *
 * `--allowedTools Read` scopes the headless session to reading the candidate
 * image files named in the prompt and nothing else — no Bash, no edits, no
 * network calls of its own. No API key, no SDK: this only ever spawns the
 * locally installed, signed-in `claude` CLI.
 */
import { spawnSync } from "node:child_process";
import type { JudgeRunner, RunJudgeResult } from "@/shared/pool/judge";

/** True when a `claude` executable can be spawned at all (not ENOENT). */
export function claudeCliAvailable(): boolean {
  const probe = spawnSync("claude", ["--version"], { encoding: "utf8" });
  return (probe.error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT";
}

export function runClaudeHeadless(prompt: string, timeoutMs: number): RunJudgeResult {
  const result = spawnSync(
    "claude",
    ["-p", prompt, "--output-format", "json", "--allowedTools", "Read", "--permission-mode", "dontAsk"],
    { timeout: timeoutMs, encoding: "utf8" },
  );
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT") {
    return { ok: false, timedOut: true };
  }
  if (result.error) return { ok: false, timedOut: false, error: result.error.message };
  if (result.signal) return { ok: false, timedOut: false, error: `claude killed by ${result.signal}` };
  if (result.status !== 0) {
    const output = (result.stderr || result.stdout || "").trim();
    return {
      ok: false,
      timedOut: false,
      error: `claude exited with status ${result.status}${output ? `: ${output}` : ""}`,
    };
  }
  return { ok: true, timedOut: false, output: result.stdout };
}

export const judgeRunner: JudgeRunner = (prompt, timeoutMs) => runClaudeHeadless(prompt, timeoutMs);
