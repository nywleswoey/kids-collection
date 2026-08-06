import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { isProductionDatabaseUrl, describeTarget } from "@/features/pool/db-target";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"] as const;

/** Non-local hostnames: anything that is not one of the local forms. */
const remoteHostArb = fc
  .domain()
  .filter((d) => !["localhost", "127.0.0.1"].includes(d));

const credsArb = fc.option(
  fc.tuple(
    fc.stringMatching(/^[a-z][a-z0-9_]{0,12}$/),
    fc.stringMatching(/^[A-Za-z0-9]{1,16}$/),
  ),
  { nil: undefined },
);

function buildUrl(
  host: string,
  creds: [string, string] | undefined,
  port: number | undefined,
  query: string,
): string {
  const auth = creds ? `${creds[0]}:${creds[1]}@` : "";
  const p = port === undefined ? "" : `:${port}`;
  return `postgresql://${auth}${host}${p}/neondb${query}`;
}

describe("isProductionDatabaseUrl (the predicate every destructive guard rests on)", () => {
  it("never calls a localhost target production, whatever else the URL carries", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LOCAL_HOSTS),
        credsArb,
        fc.option(fc.integer({ min: 1, max: 65535 }), { nil: undefined }),
        fc.constantFrom("", "?sslmode=require", "?channel_binding=require&sslmode=require"),
        (host, creds, port, query) =>
          isProductionDatabaseUrl(buildUrl(host, creds, port, query)) === false,
      ),
    );
  });

  it("calls every non-localhost host production", () => {
    fc.assert(
      fc.property(
        remoteHostArb,
        credsArb,
        fc.option(fc.integer({ min: 1, max: 65535 }), { nil: undefined }),
        (host, creds, port) =>
          isProductionDatabaseUrl(buildUrl(host, creds, port, "?sslmode=require")) === true,
      ),
    );
  });

  it("fails closed on absent, empty or unparseable input", () => {
    expect(isProductionDatabaseUrl(undefined)).toBe(true);
    expect(isProductionDatabaseUrl("")).toBe(true);
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try {
            return !new URL(s).hostname;
          } catch {
            return true;
          }
        }),
        (junk) => isProductionDatabaseUrl(junk) === true,
      ),
    );
  });

  it('is not fooled by "localhost" appearing anywhere but the host', () => {
    // The trap a naive `url.includes("localhost")` falls into.
    const traps = [
      "postgresql://u:p@prod.example.com/neondb?options=localhost",
      "postgresql://u:p@prod.example.com/localhost",
      "postgresql://localhost:pw@prod.example.com/neondb",
      "postgresql://u:p@localhost.evil.com/neondb",
    ];
    for (const url of traps) expect(isProductionDatabaseUrl(url)).toBe(true);
  });

  it("treats the real production and test URLs correctly", () => {
    expect(
      isProductionDatabaseUrl(
        "postgresql://neondb_owner:x@ep-wandering-sky-aturr1wk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require",
      ),
    ).toBe(true);
    // tests-pg/setup.ts
    expect(isProductionDatabaseUrl("postgres://postgres:postgres@localhost:5499/main")).toBe(
      false,
    );
  });
});

describe("describeTarget", () => {
  it("shows host and port, and never the credentials", () => {
    const url = "postgresql://user:sup3rsecret@db.example.com:5432/neondb";
    const shown = describeTarget(url);
    expect(shown).toBe("db.example.com:5432");
    expect(shown).not.toContain("sup3rsecret");
    expect(shown).not.toContain("user");
  });

  it("labels input it cannot parse instead of throwing", () => {
    expect(describeTarget(undefined)).toBe("(unparseable DATABASE_URL)");
    expect(describeTarget("not a url")).toBe("(unparseable DATABASE_URL)");
  });

  it("shows host:port and nothing else, for any credentials", () => {
    // Structural equality rather than "does not contain the password" — a short
    // generated password can legitimately appear inside a port number ("2" in
    // "5432"), which would fail a substring check for no real reason.
    fc.assert(
      fc.property(
        remoteHostArb,
        credsArb,
        fc.integer({ min: 1, max: 65535 }),
        (host, creds, port) =>
          describeTarget(buildUrl(host, creds, port, "?sslmode=require")) ===
          `${host}:${port}`,
      ),
    );
  });
});
