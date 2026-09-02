# `drizzle`

The database layer: the table definitions in `schema/`, the generated migration
baselines in `migrations/`, and the drizzle-kit configuration.

## Two databases

A table belongs to one of two databases. The file name says which:

- `schema/system.*.ts` — the system database: users, sessions, and the list of
  repositories.
- `schema/repo.*.ts` — one repository's research data. Every repository has its
  own SQLite file with these tables.

The two have separate migration baselines under `migrations/system` and
`migrations/repo`. See the root [README](../README.md) for the commands that
generate and apply them.

## Migration baselines

Migration SQL is an application input. `RepoManager` creates a repository
database by asking `DatabaseManager` to apply the repository migration files.
Drizzle Kit can push the schema only to a database that already exists. It
therefore cannot replace this initialization path.

`bun run db:migrations:refresh` replaces both histories with one migration from
an empty database to the current schema. It installs each migration under the
fixed `19861014000000_baseline` directory and gives its snapshot a fixed
identifier. A repeated refresh therefore changes only the generated schema
description.

The existing migration directories are deleted before generation. A failed
refresh can be rerun, or the previous files can be restored with Git.

## Entity types

`Schema.ts` registers every table under its TypeScript name. `Entity<"Table">`
is the complete row returned when that table is selected. `NewEntity<"Table">`
is the value accepted when a row is inserted. Columns with database defaults
may therefore be optional.

Both types are inferred from the table definition. A schema change therefore
changes the corresponding entity types without a second declaration.

## Foreign keys

Foreign keys are enforced on every connection. `DatabaseManager` turns them on
when it opens one. Two consequences follow.

**A foreign key cannot cross the two databases.** A repository table that
records who created a row stores the user id as plain text, with no reference to
the `User` table. That table lives in the system database. See
`schemaHelpers/metadata.ts`.

**A migration that rebuilds a table needs `PRAGMA defer_foreign_keys`.** SQLite
can add, rename, and drop a column, but it cannot change the type or the
constraints of one. drizzle-kit writes such a change as three steps: create a
new table, copy the rows, drop the old table. With foreign keys enforced, the
rows are checked against a table that is about to disappear.

`PRAGMA foreign_keys` cannot be used to avoid this. It has no effect inside a
transaction. The migrator runs each migration in one.
`PRAGMA defer_foreign_keys` does take effect there. It postpones the checks
until the commit.
