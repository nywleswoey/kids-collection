import { existsSync } from "node:fs";

/**
 * Load `.env.local` before the live provider tests are collected.
 *
 * The seed CLI gets its env from `tsx --env-file-if-exists=.env.local`; vitest
 * has no equivalent flag, and provider keys deliberately live nowhere else —
 * they are seed-time only and are never set in Vercel env (#67). `loadEnvFile`
 * is built into Node, so this needs no dotenv dependency.
 *
 * Runs as a setupFile so it lands before the test module reads `isConfigured()`
 * to decide which providers to exercise.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
