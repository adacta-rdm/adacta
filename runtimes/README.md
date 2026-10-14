# Runtimes

Adacta aims to be adaptable to different runtimes. The app depends on
contracts, such as `ApplicationDatabase` and `StorageEngine`. A runtime
provides their implementations, together with the commands that develop, build
and serve the app. This repository includes one runtime, `bun/`: Bun with an
SQLite database and a directory of stored files.

## Selecting a runtime

The alias `~runtime` in `tsconfig.json` selects the runtime:

```json
"~runtime/*": ["./runtimes/bun/*"]
```

The middleware in `app/middleware/container.ts` imports
`~runtime/appContainer.ts`. The commands in `scripts/` call `~runtime/cli.ts`,
and the test utilities in `app/testUtils/` build on
`~runtime/testEnvironment.ts`. Bun, TypeScript, Vite and Vitest all resolve the
alias. A deployment on another host therefore adds a directory beside `bun/`
and points the alias to it. No other file changes.

Vite configuration files are the exception, because Vite loads them before it
applies the alias. A runtime that needs its own Vite configuration therefore
names it in its `dev` and `build` operations.

## What a runtime provides

`Runtime.ts` defines the contract. It also checks the runtime that the alias
selects. A missing export or a different signature therefore fails the type
check. The check holds only types, so the runtime contains no code for it.

| Module               | Provides                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appContainer.ts`    | `createAppContainer()`, the root container with the runtime's database, file storage and settings                                                                |
| `cli.ts`             | The operations behind `seed:load`, `migrations:apply`, `generate`, `dev`, `build`, `start` and `test`                                                            |
| `e2eEnvironment.ts`  | `e2eSettings`, which keep the data of the browser tests apart from the development data                                                                          |
| `testEnvironment.ts` | `createTestAppContainer()`, `migrateTestDatabase()` and `emptyTestStorage()`, which give the tests an empty database and empty file storage, and `storedFiles()` |

`__tests__/` holds the tests that every runtime must pass unchanged. They use
the selected runtime through the test environment. For example,
`__tests__/ApplicationDatabase.test.ts` checks that a write that breaks a
unique constraint rejects with `UniqueConstraintViolationError`, whatever form
the database driver reports it in. `__tests__/StorageEngine.test.ts` checks the
file storage against `lib/storage-engine/StorageEngine.ts`. Tests of what only
one engine does stay beside it, for example in `bun/lib/__tests__/`.

A command checks its arguments before it calls the runtime. For example,
`seed:load a b` stops with an error in every runtime, and `seed:load pilot`
calls `seedLoad("pilot")`.

Everything that belongs to one runtime stays in its directory. Code outside
`runtimes/` imports a runtime only through the alias. For example,
`bun/sqliteDatabase.ts` opens and migrates the SQLite file, and
`bun/Dockerfile` packages the Bun runtime as an image. The README of a runtime
describes its files and its settings.

## Which runtime runs where

A runtime describes what the code runs on, not where it runs. The Bun runtime
runs on a laptop with `bun run dev`, and on a server or in a container with
`bun run start`. A runtime with other implementations of the contracts, such
as a database server instead of an SQLite file, would be a runtime of its own.
