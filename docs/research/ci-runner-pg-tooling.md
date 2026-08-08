# Can CI run `pnpm pg:up` unmodified?

**Short answer: yes.** Every tool the script needs is on a stock `ubuntu-latest` runner, at a version
that matches the containers it talks to. No `apt-get install`, no `services:` block, no changes to
`tests-pg/docker-compose.yml`.

There is one **pre-existing bug** in the script that CI will not save you from — see §7. It is not a
runner problem and it is worth fixing regardless of CI.

Verified against the runner image manifest and PostgreSQL source on **2026-08-08**, image version
`20260720.247.2`. Everything below is cited. Where something is inference rather than a quoted
primary source, it says so.

---

## 1. The script under test

```
pnpm pg:up = docker compose -f tests-pg/docker-compose.yml -p kc-pgtest up -d
  && until pg_isready -h localhost -p 5499 -U postgres -q; do sleep 0.5; done
  && for f in $(ls src/db/migrations/*.sql | sort); do
       PGPASSWORD=postgres psql -q -h localhost -p 5499 -U postgres -d main -v ON_ERROR_STOP=1 -f "$f";
     done
```

It needs four things from the host: a **`docker compose` v2 subcommand**, a running **Docker daemon**,
**`pg_isready`**, and **`psql`**. It needs two things from the network: Docker Hub (`postgres:16-alpine`)
and `ghcr.io` (the Neon proxy).

---

## 2. `ubuntu-latest` is Ubuntu 24.04 — and that is moving

`ubuntu-latest` currently resolves to **Ubuntu 24.04**
([runner-images README](https://github.com/actions/runner-images/blob/main/README.md)):

| Image | YAML Label |
|---|---|
| Ubuntu 24.04 | `ubuntu-latest` or `ubuntu-24.04` |
| Ubuntu 26.04 (preview) | `ubuntu-26.04` |

Two announcements are live on the manifest header
([Ubuntu2404-Readme.md](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)):

- [Ubuntu 26.04 is in public preview](https://github.com/actions/runner-images/issues/14226) — not yet GA,
  so `ubuntu-latest` has **not** moved.
- [Ubuntu 22 begins deprecation September 17th](https://github.com/actions/runner-images/issues/14254) —
  affects `ubuntu-22.04`, not us.

GitHub's stated policy: *"In general the `-latest` label is used for the latest OS image version that is
GA. Before moving the `-latest` label to a new OS version we will announce the change and give sufficient
lead time for users to update their workflows."*

**Why this matters here:** the good news in §5 (client and server are the *same* PostgreSQL version)
is a property of Ubuntu 24.04's runner image, not a guarantee. When `ubuntu-latest` becomes 26.04 the
bundled PostgreSQL major will likely move to 17 or 18. §5 explains why that still would not break
this script — but read it before assuming.

---

## 3. `docker compose` — present, v2, as a subcommand ✅

The manifest lists it under Tools:

```
- Docker Compose 2.38.2
```

Crucially, it is a **CLI plugin**, not the legacy Python `docker-compose` binary. The build script
installs it into the plugin directory, which is exactly the mechanism that makes `docker compose`
work as a subcommand
([install-docker.sh](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/install-docker.sh)):

```sh
mkdir -pv "/usr/libexec/docker/cli-plugins"
install "$binary_path" "/usr/libexec/docker/cli-plugins/docker-$plugin"
```

Docker's own history page confirms the distinction: V1 was *"written in Python and invoked with
`docker-compose`"*, V2 is *"written in Go and is invoked with `docker compose`"*
([docs.docker.com/compose/intro/history](https://docs.docker.com/compose/intro/history/)).

**The legacy `docker-compose` v1 binary is NOT on the image** — grepping the whole manifest for
`docker-compose` returns nothing; the only Compose entry is the v2 plugin above. So `docker compose`
is not merely *supported*, it is the *only* form that works. The script already uses it. ✅

Also relevant, from the same manifest:

```
- Docker Client 28.0.4
- Docker Server 28.0.4
- Docker-Buildx 0.35.0
```

**Compose v2 also ignores the top-level `version:` key** — it *"relies entirely on the Compose
Specification to interpret the file"* (same history page). `tests-pg/docker-compose.yml` has no
`version:` key, so this is a non-issue. Its `depends_on: condition: service_healthy` is Compose-spec
syntax and is supported by v2.

---

## 4. `psql` and `pg_isready` — present, PostgreSQL 16.14 ✅

The manifest's Databases section:

```
#### PostgreSQL
- PostgreSQL 16.14
```
```
User: postgres
PostgreSQL service is disabled by default.
Use the following command as a part of your job to start the service: 'sudo systemctl start postgresql.service'
```

**Where the binaries come from.** The image installs from the *official PostgreSQL PGDG apt repository*,
not Ubuntu's archive
([install-postgresql.sh](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/install-postgresql.sh)):

```sh
REPO_URL="https://apt.postgresql.org/pub/repos/apt/"
...
toolset_version=$(get_toolset_value '.postgresql.version')
apt-get install postgresql-$toolset_version
```

`postgresql-16` depends on `postgresql-client-16`, which is the package that ships `psql` and
`pg_isready`. So both are on `PATH` at **16.14**. *(That the client package is pulled in as a
dependency of the server package is INFERRED from Debian packaging convention — the manifest lists
only the aggregate "PostgreSQL 16.14" string. The version number itself is VERIFIED.)*

**The disabled service is a feature, not a problem.** The manifest says the local `postgresql.service`
is stopped and disabled at image build time (`systemctl disable postgresql.service` in the install
script). That means **nothing is listening on 5432**, and more importantly nothing local competes with
our container. We only want the *client* binaries, and we get them without the server running.

---

## 5. Version skew: there is none, and it would not matter anyway

This is the part the ticket was most worried about, because `backup.yml` in this repo carries the
comment:

> All client tooling runs from the `postgres:17` image rather than an apt-installed client:
> production is PostgreSQL 17.x and **a v16 pg_dump refuses to run at all**.

That comment is correct — and it is **specific to `pg_dump`/`pg_restore`**. It does not generalise to
`psql` or `pg_isready`.

### 5.1 The versions actually match exactly

| Side | Version | Source |
|---|---|---|
| Runner client (`psql`, `pg_isready`) | **16.14** | runner-images manifest (§4) |
| Container server (`postgres:16-alpine`) | **16.14** | Dockerfile below |

`postgres:16-alpine` resolves to the `16/alpine3.24` Dockerfile
([docker-library/postgres](https://github.com/docker-library/postgres/blob/master/16/alpine3.24/Dockerfile)):

```dockerfile
FROM alpine:3.24
ENV PG_MAJOR 16
ENV PG_VERSION 16.14
```

**Same major, same minor.** There is no skew to reason about today. The rest of this section is about
what happens when that stops being true — which it will, when `ubuntu-latest` rolls (§2).

### 5.2 `pg_dump` — hard failure, and only in one direction

The refusal `backup.yml` documents is real. From
[`src/bin/pg_dump/pg_backup_db.c`](https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/pg_dump/pg_backup_db.c),
`_check_database_version()`:

```c
if (remoteversion != PG_VERSION_NUM
    && (remoteversion < AH->public.minRemoteVersion ||
        remoteversion > AH->public.maxRemoteVersion))
{
    pg_log_error("aborting because of server version mismatch");
    pg_log_error_detail("server version: %s; %s version: %s",
                        remoteversion_str, progname, PG_VERSION);
    exit(1);
}
```

Note the asymmetry: `remoteversion > maxRemoteVersion` is the failing branch when the **server is newer
than the client**. `maxRemoteVersion` for a v16 `pg_dump` is v16, so a v17 server trips it and the
process `exit(1)`s. A *newer* client against an *older* server falls under `minRemoteVersion` (which
reaches back many majors) and is fine. This is exactly the "client-older-than-server is the failure
mode" the repo already knows about. **VERIFIED.**

### 5.3 `psql` — warning only, and not even printed here

`psql` performs no fatal check. The only version comparison is in `connection_warnings()` in
[`src/bin/psql/command.c`](https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/psql/command.c):

```c
/*
 * Warn if server's major version is newer than ours, or if server
 * predates our support cutoff (currently 9.2).
 */
if (pset.sversion / 100 > client_ver / 100 ||
    pset.sversion < 90200)
    printf(_("WARNING: %s major version %s, server major version %s.\n"
             "         Some psql features might not work.\n"), ...
```

It is a `printf`. There is no `exit()`, no `pg_fatal()`. Worse-case is cosmetic noise.

**And it is not even reachable in this script.** In
[`src/bin/psql/startup.c`](https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/psql/startup.c),
`connection_warnings(true)` is called only in the `else` branch that *"otherwise enter[s] interactive
main loop"* — i.e. the branch taken when there is no `-f`/`-c`. Our invocation uses `-f "$f"`, which
takes the non-interactive branch. On top of that, the whole function body is guarded by
`if (!pset.quiet && !pset.notty)` and we pass `-q`.

So for `psql`: no fatal check in either direction, and the warning is triple-suppressed here.
**VERIFIED.**

### 5.4 `pg_isready` — no version logic whatsoever

[`src/bin/scripts/pg_isready.c`](https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/scripts/pg_isready.c)
does exactly one thing:

```c
rv = PQpingParams(keywords, values, 1);
...
exit(rv);
```

Grepping the entire 242-line file for version logic finds only `handle_help_version_opts` (that is
`--version`, the flag) and the `PQPING_*` exit codes. It never calls `PQserverVersion`, never compares
anything. `PQpingParams` establishes whether a server is *accepting connections* — a protocol-level
question that predates and ignores server version.

**`pg_isready` cannot fail on version skew, in either direction.** **VERIFIED.**

### 5.5 Summary of skew behaviour

| Tool | Client older than server | Client newer than server |
|---|---|---|
| `pg_dump` / `pg_restore` | **fatal `exit(1)`** | fine (within `minRemoteVersion`) |
| `psql` | cosmetic warning; suppressed by `-q` and by `-f` | silent, fine |
| `pg_isready` | no check at all | no check at all |

**Consequence for `ubuntu-latest` rolling to 26.04:** the client would become *newer* than our pinned
`postgres:16-alpine` server. That is the benign direction for all three tools. `pg:up` uses only
`psql` and `pg_isready`, neither of which checks anything. So the image roll is **not** a risk for this
script. *(This is INFERRED from the three verified behaviours above — I did not test a 17/18 client
against a 16 server.)*

---

## 6. Pinning: the major is pinned, the minor floats

From
[`toolset-2404.json`](https://github.com/actions/runner-images/blob/main/images/ubuntu/toolsets/toolset-2404.json):

```json
"postgresql": { "version": "16" }
```
```json
"docker": {
  "components": [
    { "package": "containerd.io", "version": "latest" },
    { "package": "docker-ce-cli",  "version": "28.0.4" },
    { "package": "docker-ce",      "version": "28.0.4" }
  ],
  "plugins": [
    { "plugin": "buildx",  "version": "latest",  "asset": "linux-amd64" },
    { "plugin": "compose", "version": "2.38.2",  "asset": "linux-x86_64" }
  ]
}
```

Read this carefully — the pinning is uneven:

- **PostgreSQL: major pinned, minor floats.** `"16"` means `apt-get install postgresql-16`. Whatever
  16.x PGDG happens to serve on image-build day is what you get. Today 16.14; a future rebuild could
  ship 16.15 with no announcement. Minor bumps are wire-compatible, so this is harmless for us — but
  do not write a CI assertion against `16.14`.
- **Docker Compose: exactly pinned** at `2.38.2`. Changes only when the toolset file changes.
- **Buildx and containerd: `latest`.** Unpinned, but we use neither directly.

**The real unpinned variable is the image itself**, not the toolset. `ubuntu-latest` is a moving label
by design (§2). Anything depending on PostgreSQL *major* 16 being on the runner is depending on an
announced-but-not-guaranteed alias. As §5.5 argues, `pg:up` does not depend on it.

---

## 7. The genuine bug: the migration loop swallows failures

This is not a runner issue. The script would behave this way locally too. Fixing it is the single
highest-value change in this document.

```sh
for f in $(ls src/db/migrations/*.sql | sort); do
  PGPASSWORD=postgres psql ... -v ON_ERROR_STOP=1 -f "$f";
done
```

`-v ON_ERROR_STOP=1` correctly makes **each `psql`** exit non-zero on a SQL error. But the `for` loop
throws that away. POSIX
([Shell Command Language §2.9.4](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_09_04_02)):

> "The exit status of a **for** command shall be the exit status of the last command that executes.
> If there are no items, the exit status shall be zero."

So the loop's status is whatever **the last migration** returned. With 8 migrations, if `0003` fails
and `0007` succeeds, `pnpm pg:up` **exits 0** and CI goes green on a half-migrated database. The
failure surfaces later as a confusing test error against a schema that is missing tables.

Worse, the "no items" clause means a typo'd glob path that matches nothing also exits 0 — you get a
completely empty database and a green build.

**Cheapest fix**, entirely within `package.json`, no new files:

```sh
for f in src/db/migrations/*.sql; do
  PGPASSWORD=postgres psql -q -h localhost -p 5499 -U postgres -d main \
    -v ON_ERROR_STOP=1 -f "$f" || exit 1;
done
```

Two changes: `|| exit 1` propagates the first failure immediately, and the bare glob replaces
`$(ls ... | sort)`. The glob is not just shorter — it is *more correct*. Shell pathname expansion is
already sorted (POSIX: results "shall be sorted according to the collating sequence"), so `| sort` was
redundant; and dropping the command substitution removes the word-splitting hazard entirely. Both
forms happen to work for the current filenames (`0000_cute_ricochet.sql` … `0007_quiz_seen_questions.sql`
— no spaces, zero-padded so lexical order is numeric order), but the glob stays correct if a filename
ever gains a space.

---

## 8. Other runner gotchas — all clear

### 8.1 Docker daemon: running by default ✅

The manifest lists **`Docker Server 28.0.4`** as distinct from `Docker Client 28.0.4`. The server
entry is the daemon. GitHub's service-container docs make the requirement explicit only for
self-hosted runners — *"If you are using self-hosted runners, you must use a Linux machine as your
runner and Docker must be installed"*
([docs](https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers)) —
which is precisely because GitHub-hosted runners already have it.

Strongest evidence is in this repo: **`.github/workflows/backup.yml` already runs `docker pull` and
`docker run` on `ubuntu-latest` with no setup step**, and is a working nightly job. No `sudo` needed;
the runner user is in the `docker` group (the install script does `groupmod -g "$gid" docker`).

### 8.2 `ghcr.io` unauthenticated pull ✅

GitHub's Container registry docs: *"You can also access public container images anonymously."*
([docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry))

I confirmed this live for the exact image the compose file uses. Fetching an anonymous pull token and
requesting the manifest for `ghcr.io/timowilhelm/local-neon-http-proxy:main` returned **HTTP 200** with
no credentials of any kind. **VERIFIED empirically, 2026-08-08.**

Caveat worth knowing: this is an upstream `:main` tag on someone else's personal namespace. It is a
mutable tag on a third-party account — a supply-chain and availability dependency, not a runner
problem. Out of scope here, but it is the most fragile thing in the compose file.

### 8.3 The shell and `until` ✅

Two shells are involved, and neither is a problem.

**GitHub's step shell.** The default for `run:` on Linux is `bash -e {0}`; writing `shell: bash`
explicitly instead gives `bash --noprofile --norc -eo pipefail {0}`
([workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsstepshell)).
Note `pipefail` is **not** on by default — irrelevant here since `pg:up` has no pipelines.

**The shell npm/pnpm actually uses.** A package.json script is not run by GitHub's bash; it is handed
to `/bin/sh` (dash on Ubuntu). `until ... ; do ... done` is POSIX shell, supported by dash. So is
`$(...)` and `for`.

**Does `-e` kill the `until` loop?** No — and this is worth being explicit about, because it looks
dangerous. `pg_isready` exits non-zero while Postgres is still starting, which under `errexit` would
normally abort. It does not, for two independent reasons: (a) a command whose status is being *tested*
as a loop condition is exempt from `-e` by POSIX; (b) `-e` is not even active in the dash subshell
running the script. The loop exits 0 once `pg_isready` succeeds — POSIX again: *"The exit status of the
until loop shall be the exit status of the last compound-list-2 executed, or zero if none was
executed."*

**Note the belt-and-braces already present:** the compose file gives `pg` a `healthcheck` *and* the
script polls with `pg_isready`. The healthcheck gates `neon-proxy`'s `depends_on`; the `pg_isready`
poll gates the migrations. Both are needed — `up -d` returns as soon as containers are *created*, not
when Postgres is *ready*.

### 8.4 Ports 5499 and 4499 ✅

No conflict. Both are arbitrary high ports, and the two services on the image that could plausibly
collide are off:

- *"PostgreSQL service is disabled by default"* (manifest) — nothing on 5432, let alone 5499.
- *"MySQL service is disabled by default"* (manifest).

Docker publishes to the host with `--publish` (GitHub's docs describe the same mechanism for service
containers), and `localhost:<port>` reaches them from a job running directly on the runner machine
([docs](https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers)).
The script's `-h localhost -p 5499` is therefore right.

*(That nothing else on the image binds 5499/4499 is INFERRED — I checked that the two obvious database
services are disabled, but did not enumerate every listening socket on a live runner.)*

---

## 9. Verdict and recommendation

**Run it unmodified.** No `apt-get`, no `services:` block, no change to `tests-pg/docker-compose.yml`.
The compose file stays the single source of truth for the test database, which is the outcome the
ticket wanted.

### Do NOT port to GitHub `services:`

It would fork the definition: CI would describe the database in `.github/workflows/`, developers would
get it from `tests-pg/docker-compose.yml`, and the two would drift. `services:` also cannot express
`depends_on: condition: service_healthy`, so the `neon-proxy` ordering would have to be hand-rolled.
Strictly worse.

### Do NOT adopt the `backup.yml` docker-run-the-client pattern here

`backup.yml` uses `docker run --rm --network host -e PGURL "$PG_IMAGE" sh -c 'psql ...'` for a good
reason that **does not apply to `pg:up`**:

| | `backup.yml` | `pg:up` |
|---|---|---|
| Server | Neon, PostgreSQL **17.x** | container, **16.14** |
| Runner client | 16.14 | 16.14 |
| Skew | client older — **fatal for `pg_dump`** | **none** |
| Tools used | `pg_dump`, `psql` | `psql`, `pg_isready` |

`backup.yml` needs a v17 client because `pg_dump` genuinely refuses (§5.2). `pg:up` talks to a v16
server with a v16 client using two tools that perform no version check at all (§5.3, §5.4). Wrapping
them in `docker run` would add a container start per migration for zero benefit, and would make the
local and CI code paths differ.

**Keep it in reserve, though.** If `ubuntu-latest` ever moves to an image whose PostgreSQL client is
too new, or if this script grows a `pg_dump`, the `backup.yml` pattern is the correct fix and the repo
already knows it. Retrofitting is a one-line change.

### The one thing to actually change

Fix the migration loop (§7) — it silently green-lights a half-migrated database. That is a real
correctness hole today, in CI and locally, independent of anything in this document.

---

## Appendix — sources

Everything above traces to one of these. All read 2026-08-08.

| What | URL |
|---|---|
| `ubuntu-latest` alias, `-latest` policy | https://github.com/actions/runner-images/blob/main/README.md |
| Ubuntu 24.04 manifest (image `20260720.247.2`) | https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md |
| Compose installed as a CLI plugin | https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/install-docker.sh |
| PostgreSQL from PGDG; service disabled | https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/install-postgresql.sh |
| Version pins (`postgresql: "16"`, `compose: 2.38.2`) | https://github.com/actions/runner-images/blob/main/images/ubuntu/toolsets/toolset-2404.json |
| Ubuntu 26.04 public preview | https://github.com/actions/runner-images/issues/14226 |
| Ubuntu 22 deprecation | https://github.com/actions/runner-images/issues/14254 |
| Compose V1 vs V2 invocation | https://docs.docker.com/compose/intro/history/ |
| `postgres:16-alpine` = PG 16.14 | https://github.com/docker-library/postgres/blob/master/16/alpine3.24/Dockerfile |
| `pg_dump` fatal version check | https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/pg_dump/pg_backup_db.c |
| `psql` warning-only check | https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/psql/command.c |
| `psql` calls it only when interactive | https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/psql/startup.c |
| `pg_isready` has no version check | https://github.com/postgres/postgres/blob/REL_16_STABLE/src/bin/scripts/pg_isready.c |
| `for`/`until` exit status; glob sorting | https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_09_04_02 |
| Default shell `bash -e {0}` | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsstepshell |
| Docker on runners; `localhost:<port>`; `--publish` | https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers |
| Anonymous `ghcr.io` pulls | https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry |
