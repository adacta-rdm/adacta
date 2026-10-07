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
bun run db:setup
bun run dev
```

Open <http://localhost:5173> and sign in as `dev@adacta.test` with the password
`password`. Setup loads the `demo` preset. Run `bun run db:setup pilot` for the
pilot inventory or `bun run db:setup feature-test` for the measurement import
fixtures. Each setup command deletes the current local database.

`bun run dev` and `bun run start` apply pending SQL migrations before starting
the server. A regenerated baseline requires a database reset. Run
`bun run db:setup` after pulling that change.

## Databases

One SQLite file holds authentication and laboratory records:

```
.adacta/db/adacta.sqlite
```

Set `ADACTA_DB_DIR` to store the file in another directory.

## Original files

The server assigns each file an identifier and stores its bytes under
`ADACTA_STORAGE_DIR`:

```
.adacta/storage/
  uploads/<upload id>/<file id>       staged files
  original-files/<file id>            original file bytes
```

The database records each original file after every file in its upload has
moved out of staging. An incomplete upload therefore has no file records.

An upload containing one CSV and one TOML sidecar opens a measurement review.
The review shows how columns map to a selected rig's P&ID. Import stores the
original files, a Parquet dataset, and a summary used by the trend charts.

Set `ADACTA_STORAGE_DIR` to store the files in another directory.

Catalog logos and product photographs are original files too. The seed records
them through `UploadManager` and stores their file IDs on catalog records.
Catalog pages retrieve them from `/files/originals/<file id>` after sign-in.
See [`seed/README.md`](seed/README.md) for the image paths and supported formats.

## Commands

| Command                         | What it does                                                          |
| ------------------------------- | --------------------------------------------------------------------- |
| `bun run dev`                   | Migrate, then start the development server on <http://localhost:5173> |
| `bun run build`                 | Build the client and server bundles into `build/`                     |
| `bun run build:tsrc`            | Generate runtime validators from the TypeScript declarations          |
| `bun run start`                 | Migrate, then serve a build on `PORT` or port 3000                    |
| `bun run db:migrations:refresh` | Rebuild the application migration baseline                            |
| `bun run db:migrations:migrate` | Apply pending SQL migrations                                          |
| `bun run db:reset`              | Delete the application database and migrate from scratch              |
| `bun run db:setup [preset]`     | Reset and load a preset, defaulting to `demo`                         |
| `bun run precommit`             | Type check, lint, format, then run the tests. Repairs what it can     |
| `bun test`                      | Run the test suite                                                    |
| `bun run test:e2e`              | Run the browser journeys in headless Chromium                         |
| `bun run test:e2e:ui`           | Open the interactive Playwright test runner                           |
| `bun run typecheck`             | Generate route types and runtime validators, then run `tsc`           |
| `bun run lint`                  | Run oxlint                                                            |
| `bun run format`                | Format with oxfmt                                                     |
| `bun run format:check`          | Report formatting problems without changing files                     |

Use `db:setup` when a database is in an unclear state. It starts from an empty
database. The result is therefore the same whether it was present or absent.

`db:reset` and `db:setup` stop with an error when `NODE_ENV` is
`production`. The migration refresh and migrate commands are always allowed.

### Browser tests

The end-to-end suite uses Playwright. Each test opens a browser and runs against
an isolated copy of the application. The suite covers a small set of stable user
tasks. See [`e2e/README.md`](e2e/README.md) for the commands and the rules for
writing these tests.

## Changing the schema

Tables live in `drizzle/schema/`. All tables share one database and migration
history.

Migration SQL initializes the application database. Refresh the baseline after
changing a table or a fixed lookup list, then rebuild the development database:

```bash
# after changing the schema or fixed lookup lists
bun run db:migrations:refresh
bun run db:setup
```

The refresh command deletes the existing migration history and generates new
baselines. Its directory name and snapshot identifier are stable. Git
therefore shows the schema changes within the same files. The baseline describes an empty
database becoming the current schema. It is therefore used with `db:setup`,
which deletes the application database first.

Foreign keys are enforced on every connection. This limits how a migration may
change an existing table. See [`drizzle/README.md`](drizzle/README.md).

## Environment variables

Bun reads a `.env` file in the project root. These variables can be set
there.

| Variable             | Meaning                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `ADACTA_DB_DIR`      | Directory that holds adacta.sqlite. Defaults to `.adacta/db`                    |
| `ADACTA_STORAGE_DIR` | Directory that holds imported source files. Defaults to `.adacta/storage`       |
| `ADACTA_URL`         | Address the application is reached at. Defaults to `http://localhost:5173`      |
| `ADACTA_AUTH_SECRET` | Secret for signing cookies and tokens. Required when `NODE_ENV` is `production` |
| `ADACTA_DEV_USER`    | Email address of an existing user to sign in as, without the login form         |
| `ADACTA_LOG_LEVEL`   | One of silent, fatal, error, warn, info, debug, trace. Defaults to `info`       |
| `PORT`               | Port for `bun run start`. Defaults to 3000                                      |

`ADACTA_DEV_USER` is meant for development. It is never read when `NODE_ENV` is
`production`.

## Funding and support

Adacta was developed as part of the [NFDI4Cat](https://nfdi4cat.org) project.
[omegadot](https://www.omegadot.software) provided further support. Its work on
Adacta was funded by the German Federal Ministry of Research, Technology and
Space (BMFTR).
