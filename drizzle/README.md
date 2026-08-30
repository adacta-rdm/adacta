# `drizzle`

The database layer: the table definitions in `schema/`, the generated
migrations in `migrations/`, and the drizzle-kit configuration.

## Two databases

A table belongs to one of two databases. The file name says which:

- `schema/system.*.ts` — the system database: users, sessions, and the list of
  repositories.
- `schema/repo.*.ts` — one repository's research data. Every repository has its
  own SQLite file with these tables.

The two have separate migration histories, under `migrations/system` and
`migrations/repo`, and separate drizzle-kit configurations. See the root
[README](../README.md) for the commands that generate and apply them.

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
