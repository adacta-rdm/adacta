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
`password`. The seed creates two repositories, `demo` and `pilot`.

`bun run dev` does not apply migrations. Run `bun run db:setup && bun run dev`
after pulling a change to the schema.

## Databases

Each repository has its own SQLite file. One further database, the system
database, holds the users, the sessions, and the list of repositories.

```
.adacta/db/
  _system.sqlite     users, sessions, repositories, and who may open them
  demo.sqlite        one repository's data
  pilot.sqlite
```

Set `ADACTA_DB_DIR` to store the files in another directory.

## Commands

| Command                         | What it does                                                         |
| ------------------------------- | -------------------------------------------------------------------- |
| `bun run dev`                   | Start the development server on <http://localhost:5173>              |
| `bun run build`                 | Build the client and server bundles into `build/`                    |
| `bun run start`                 | Serve a build, on `PORT` or on port 3000                             |
| `bun run db:migrations:refresh` | Rebuild the system and repository migration baselines                |
| `bun run db:migrations:migrate` | Apply pending migrations to the system database and every repository |
| `bun run db:reset`              | Delete every database, then migrate from scratch                     |
| `bun run db:setup`              | Reset, then seed                                                     |
| `bun run db:seed`               | Load the development seed                                            |
| `bun test`                      | Run the test suite                                                   |
| `bun run typecheck`             | Generate route types, then run `tsc`                                 |
| `bun run lint`                  | Run oxlint                                                           |
| `bun run format`                | Format with oxfmt                                                    |
| `bun run format:check`          | Report formatting problems without changing files                    |

Use `db:setup` when a database is in an unclear state. It starts from an empty
directory. The result is therefore the same whether databases were present or
not.

`db:reset`, `db:setup`, and `db:seed` stop with an error when `NODE_ENV` is
`production`. The migration refresh and migrate commands are always allowed.

Running `db:seed` again is safe. It replaces the inventory of each repository
and leaves the users and the repositories unchanged.

## Changing the schema

Tables live in `drizzle/schema/`, named after the database they belong to:
`system.*.ts` for the system database, `repo.*.ts` for a repository.

Adacta keeps generated migration SQL because `RepoManager` uses it to initialize
each new repository database. Drizzle Kit can push a schema to one existing
database, but it cannot provide the SQL needed when a repository is created
later.

Refresh both migration baselines after changing a table, then rebuild the
development databases:

```bash
# after editing a file in drizzle/schema/
bun run db:migrations:refresh
bun run db:setup
```

The refresh command deletes both existing migration histories and generates new
baselines. Their directory names and snapshot identifiers are stable. Git
therefore shows the schema changes within the same files. The baseline describes an empty
database becoming the current schema. It is therefore used with `db:setup`,
which deletes the development databases first.

Foreign keys are enforced on every connection. This limits how a migration may
change an existing table. See [`drizzle/README.md`](drizzle/README.md).

## Environment variables

Bun reads a `.env` file in the project root. These variables can be set
there.

| Variable             | Meaning                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `ADACTA_DB_DIR`      | Directory that holds the SQLite files. Defaults to `.adacta/db`                 |
| `ADACTA_URL`         | Address the application is reached at. Defaults to `http://localhost:5173`      |
| `ADACTA_AUTH_SECRET` | Secret for signing cookies and tokens. Required when `NODE_ENV` is `production` |
| `ADACTA_DEV_USER`    | Email address of an existing user to sign in as, without the login form         |
| `ADACTA_LOG_LEVEL`   | One of silent, fatal, error, warn, info, debug, trace. Defaults to `info`       |
| `PORT`               | Port for `bun run start`. Defaults to 3000                                      |

`ADACTA_DEV_USER` is meant for development. It is never read when `NODE_ENV` is
`production`.
