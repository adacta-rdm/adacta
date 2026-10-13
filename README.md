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
