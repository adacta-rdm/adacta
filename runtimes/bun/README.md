# Bun runtime

This runtime runs Adacta on Bun with one SQLite file and a directory of stored
files. The alias `~runtime` in `tsconfig.json` selects it. See
[`../README.md`](../README.md).

| Path                 | Holds                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `appContainer.ts`    | The container, with the SQLite database and the file storage                                                                        |
| `sqliteDatabase.ts`  | Opens and migrates the SQLite file                                                                                                  |
| `server.ts`          | Serves a build. `bun run start` runs it.                                                                                            |
| `Dockerfile`         | Packages this runtime as an image                                                                                                   |
| `testEnvironment.ts` | Containers for the tests, each with its own temporary directory                                                                     |
| `e2eEnvironment.ts`  | The data directories of the browser tests                                                                                           |
| `cli.ts`, `cli/`     | The operations behind the package scripts                                                                                           |
| `lib/`               | Modules that know nothing about Adacta and that only this runtime uses. `FileSystemStorageEngine` stores files below one directory. |

## Data

The database is one SQLite file. The file storage is a directory. Both are
below the working directory by default:

```
.adacta/db/adacta.sqlite
.adacta/storage/
```

Each test uses a new temporary directory. The browser tests use
`.adacta/e2e/`.

## Settings

| Variable             | Meaning                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `ADACTA_DB_DIR`      | Directory that holds adacta.sqlite. Defaults to `.adacta/db`         |
| `ADACTA_STORAGE_DIR` | Directory that holds the stored files. Defaults to `.adacta/storage` |
| `PORT`               | Port for `bun run start`. Defaults to 3000                           |

## Image

Build the image from the project root, which is the build context:

```sh
docker build -f runtimes/bun/Dockerfile .
```

The image runs `bun run start`. It therefore applies pending migrations before
it serves the build.
