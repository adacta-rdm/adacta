# `drizzle`

The database layer: the table definitions in `schema/`, the generated migration
baselines in `migrations/`, and the drizzle-kit configuration.

## One database

Authentication and laboratory tables share one SQLite file. Each file in
`schema/` is named for its table or its authentication schema. `config.ts`
reads every file in `schema/` into one migration history under `migrations/`.

## Migration baseline

Migration SQL initializes the database and applies schema changes.
`bun run db:migrations:refresh` replaces the history with one migration from
an empty database to the current schema. The baseline uses the fixed directory
`19861014000000_baseline` and a fixed snapshot identifier. A repeated refresh
therefore shows only schema changes in Git.

The existing migration directory is deleted before generation. A failed refresh
can be rerun or the previous files can be restored with Git.

The baseline inserts the fixed quantity kinds and diagram edge kinds listed
in `app/lib/quantities.ts` and `app/lib/PID.ts`. Domain records refer to these
names through foreign keys. A changed list therefore requires
`bun run db:migrations:refresh` and a database reset.

The local connection is opened in `app/.server/sqliteDatabase.ts`. The CLI
and test setup apply SQL through `app/.server/migrateSqliteDatabase.ts`.
`bun run dev` and `bun run start` run the migration command before the server
starts.

See the root [README](../README.md) for the setup and migration commands.

## Entity types

`Schema.ts` registers every table under its TypeScript name. `Entity<"Table">`
is the complete row returned when that table is selected. `NewEntity<"Table">`
is the value accepted when a row is inserted. Columns with database defaults
may therefore be optional.

Both types are inferred from the table definition. A schema change therefore
changes the corresponding entity types without a second declaration.

## PROV labels

Some tables end their comment with a line such as `PROV: prov:Entity.`. The
line names the matching term in PROV, the W3C model for recording where data
came from. For example, a note is a `prov:Entity`, and the version an edit
replaced is linked by `prov:wasRevisionOf`. Only tables that hold evidence or
results carry the line. The catalog and the inventory do not.

In such a table the metadata columns also have a PROV meaning. The creator is
`prov:wasAttributedTo`, and the creation time is `prov:generatedAtTime`.
Adacta does not use PROV today. The lines show how a later migration can map
the data onto it.

## Foreign keys

Foreign keys are enforced on every connection. `openSqliteDatabase` turns them
on when it opens one. Two consequences follow.

Creator and preparer IDs retain their existing text columns and constraints.
Combining the tables preserves those definitions.

**A migration that rebuilds a table needs `PRAGMA defer_foreign_keys`.** SQLite
can add, rename, and drop a column, but it cannot change the type or the
constraints of one. drizzle-kit writes such a change as three steps: create a
new table, copy the rows, drop the old table. With foreign keys enforced, the
rows are checked against a table that is about to disappear.

`PRAGMA foreign_keys` cannot be used to avoid this. It has no effect inside a
transaction. The migrator runs each migration in one.
`PRAGMA defer_foreign_keys` does take effect there. It postpones the checks
until the commit.
