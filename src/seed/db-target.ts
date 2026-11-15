/**
 * Which database is a seed script about to write to? (Inc23 FR3)
 *
 * Pure — no `db` import, no I/O — so the predicate every destructive guard rests
 * on can be property-tested without a database. A FALSE NEGATIVE here silently
 * disables every guard in the increment, so the classification is deliberately
 * fail-closed: anything that is not provably a developer's own machine counts as
 * production, including an absent or unparseable URL.
 */

/** Hosts that are unambiguously local. Everything else is production. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Host of `url`, or null when it will not parse. `URL` keeps IPv6 hosts in
 * brackets (`[::1]`), so those are unwrapped to compare against LOCAL_HOSTS.
 */
function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    if (!hostname) return null;
    return hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  } catch {
    return null;
  }
}

/**
 * True unless the URL provably points at localhost. Note this reads the parsed
 * *hostname* — a production URL whose path or query merely contains the text
 * "localhost" is still production, which a substring check would get wrong.
 */
export function isProductionDatabaseUrl(url: string | undefined): boolean {
  const host = hostOf(url);
  return host === null || !LOCAL_HOSTS.has(host);
}

/** Human-readable target for the blast-radius report. Never includes credentials. */
export function describeTarget(url: string | undefined): string {
  const host = hostOf(url);
  if (host === null) return "(unparseable DATABASE_URL)";
  const port = (() => {
    try {
      return new URL(url!).port;
    } catch {
      return "";
    }
  })();
  return port ? `${host}:${port}` : host;
}
