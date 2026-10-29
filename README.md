# Adacta

A research data management system for experimental science, built for the
[NFDI4Cat](https://nfdi4cat.org) project.

> This file is for developers. It describes how to run and develop Adacta
> locally. It is not an end-user guide.

## Prerequisites

[Bun](https://bun.sh/) 1.3 or later.

## Quick start

```bash
bun install
bun run seed:load
bun run dev
```

Open <http://localhost:5173> and sign in as `dev@adacta.test` with the password
`password`. `seed:load` loads the `demo` preset. Run `bun run seed:load pilot`
to load `pilot` instead.

`bun run dev` and `bun run start` apply pending SQL migrations before starting
the server. A rebuilt baseline requires a database reset. Run
`bun run seed:load` after pulling that change.

## Application version

Open `/version` without signing in to see the full Git commit and the UTC build
time of the running application. The suffix ` (modified)` means tracked or
untracked files had changes when the Vite configuration loaded; ignored files
do not count. In development, both values are recorded when the server starts.

## Data

One database holds authentication and laboratory records. The file storage
holds the bytes of uploaded files. The runtime decides where both are kept. See
[`runtimes/README.md`](runtimes/README.md). For example, the Bun runtime keeps
an SQLite file in `.adacta/db/` and the files in `.adacta/storage/`.

## Original files

The server assigns each file an identifier and stores its bytes in the file
storage under these paths:

```
uploads/<upload id>/<file id>       staged files
original-files/<file id>            original file bytes
```

The database records each original file after every file in its upload has
moved out of staging. An incomplete upload therefore has no file records.

An upload containing one CSV and one TOML sidecar opens a dataset review.
The review shows how columns map to a selected rig's P&ID. Import stores the
original files, a Parquet dataset, and a summary used by the trend charts.

Catalog logos and product photographs are original files too. The seed records
them through `UploadManager` and stores their file IDs on catalog records.
Catalog pages retrieve them from `/files/originals/<file id>` after sign-in.
See [`seed/README.md`](seed/README.md) for the image paths and supported formats.

## Commands

| Command                       | What it does                                                          |
| ----------------------------- | --------------------------------------------------------------------- |
| `bun run dev`                 | Migrate, then start the development server on <http://localhost:5173> |
| `bun run build`               | Build the client and server bundles into `build/`                     |
| `bun run build:tsrc`          | Generate runtime validators from the TypeScript declarations          |
| `bun run start`               | Migrate, then serve a build                                           |
| `bun run migrations:baseline` | Rebuild the migration baseline from the schema                        |
| `bun run migrations:apply`    | Apply pending SQL migrations                                          |
| `bun run seed:load [preset]`  | Delete the local data and load a preset, defaulting to `demo`         |
| `bun run precommit`           | Type check, lint, format, then run the tests. Repairs what it can     |
| `bun run test`                | Run the test suite                                                    |
| `bun run test:e2e`            | Run the browser journeys in headless Chromium                         |
| `bun run test:e2e:ui`         | Open the interactive Playwright test runner                           |
| `bun run typecheck`           | Generate route types and runtime validators, then run `tsc`           |
| `bun run lint`                | Run oxlint                                                            |
| `bun run format`              | Format with oxfmt                                                     |
| `bun run format:check`        | Report formatting problems without changing files                     |

The commands run on the runtime that `tsconfig.json` selects. See
[`runtimes/README.md`](runtimes/README.md).

## Accounts and invitations

Accounts are invitation-only. An administrator can invite a new user or grant
access to an existing record-only user from **Users**. Activation preserves the
user's identity and laboratory record references. Setup links last 48 hours;
resending replaces the old link, and canceling invalidates it. Users with an
account can select **Forgot password?** on the sign-in page for a one-hour
recovery link. Changing a password signs out existing sessions.

The development seed makes `dev@adacta.test` an administrator. For a new
deployment, create the first administrator from an interactive server terminal:

```bash
bun run users:admin create --email admin@example.org --name "Lab Administrator"
```

The command prompts for a password without displaying it. To change an existing
user's role from the server:

```bash
bun run users:admin role --email researcher@example.org --role admin
bun run users:admin role --email researcher@example.org --role user
```

Administrators can also change roles in **Users**. The last administrator cannot
be demoted. Other laboratory permissions remain the same for both roles.
Invitations use the identity established for the request. This also applies
when an administrator signs in through `ADACTA_DEV_USER` during development.

### Bun email configuration

Set `ADACTA_URL` to the externally reachable application URL. Invitations and
recovery use this address, not the incoming request's host. Configure SMTP on
the server with these variables:

| Variable                  | Purpose / default                                       |
| ------------------------- | ------------------------------------------------------- |
| `ADACTA_SMTP_HOST`        | Required SMTP hostname                                  |
| `ADACTA_MAIL_FROM`        | Required sender, e.g. `Adacta <noreply@example.org>`    |
| `ADACTA_SMTP_PORT`        | `587`                                                   |
| `ADACTA_SMTP_SECURE`      | Implicit TLS; defaults to true on port `465`            |
| `ADACTA_SMTP_REQUIRE_TLS` | Require STARTTLS; defaults to true without implicit TLS |
| `ADACTA_SMTP_USER`        | Optional SMTP username                                  |
| `ADACTA_SMTP_PASSWORD`    | Optional SMTP password; required when a username is set |

For Cloudflare Email Service as the SMTP provider, use
`smtp.mx.cloudflare.net`, port `465`, `ADACTA_SMTP_SECURE=true`, username
`api_token`, and an API token with Email Sending permission as the password.
The sender domain must be onboarded with the provider.

SMTP configuration is checked when sending. Failed invitations keep the identity
so an administrator can fix configuration and retry. Failed delivery does not
leave an active setup token. Recovery requests return a generic response;
delivery failures are logged without message contents or credentials.
STARTTLS is required by default on connections without implicit TLS. Set
`ADACTA_SMTP_REQUIRE_TLS=false` only when the SMTP relay does not support it.

Email templates and authentication depend on the `EmailSender` contract. Only
the Bun adapter imports Nodemailer; a future Cloudflare runtime will provide
the same contract through its native email binding.

The account-role schema change requires rebuilding a development database
created from an older baseline: run `bun run seed:load` after updating. This
deletes local data; preserve anything needed before resetting. The project does
not currently support upgrading an existing database through incremental migrations.

Use `seed:load` when the local data is in an unclear state. It starts from an
empty database and an empty file store. The result is therefore the same
whether they were present or absent.

`seed:load` stops with an error when `NODE_ENV` is `production`.
`migrations:apply` and `migrations:baseline` are always allowed.

### Browser tests

The end-to-end suite uses Playwright. Each test opens a browser and runs against
an isolated copy of the application. The suite covers a small set of stable user
tasks. See [`e2e/README.md`](e2e/README.md) for the commands and the rules for
writing these tests.

## Changing the schema

Tables live in `drizzle/schema/`. All tables share one database and migration
history.

Migration SQL initializes the application database. Rebuild the baseline after
changing a table or a fixed lookup list, then rebuild the development database:

```bash
# after changing the schema or fixed lookup lists
bun run migrations:baseline
bun run seed:load
```

The baseline command deletes the existing migration history and generates new
baselines. Its directory name and snapshot identifier are stable. Git
therefore shows the schema changes within the same files. The baseline describes an empty
database becoming the current schema. It is therefore used with `seed:load`,
which deletes the local data first.

Foreign keys are enforced on every connection. This limits how a migration may
change an existing table. See [`drizzle/README.md`](drizzle/README.md).

## Environment variables

Bun reads a `.env` file in the project root. These variables can be set
there. Each runtime adds its own. See the README in its directory, for example
[`runtimes/bun/README.md`](runtimes/bun/README.md).

| Variable             | Meaning                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `ADACTA_URL`         | Address the application is reached at. Defaults to `http://localhost:5173`      |
| `ADACTA_AUTH_SECRET` | Secret for signing cookies and tokens. Required when `NODE_ENV` is `production` |
| `ADACTA_DEV_USER`    | Email address of an existing user to sign in as, without the login form         |
| `ADACTA_LOG_LEVEL`   | One of silent, fatal, error, warn, info, debug, trace. Defaults to `info`       |

`ADACTA_DEV_USER` is meant for development. It is never read when `NODE_ENV` is
`production`.

## Funding and support

Adacta was developed as part of the [NFDI4Cat](https://nfdi4cat.org) project.
[omegadot](https://www.omegadot.software) provided further support. Its work on
Adacta was funded by the German Federal Ministry of Research, Technology and
Space (BMFTR).
