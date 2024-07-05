# Adacta

Adacta is a research data management (RDM) system developed as part of the [NFDI4cat](https://nfdi4cat.org) project.
Adacta's primary design goal is to store research data in a way that is easily understandable and traceable by creating
a digital twin of a catalyst testing environment, including a time-accurate record of the critical components used to
measure catalyst performance.

## Prerequisites for development

Make sure you have the following installed:

- `Node.js` v20 (LTS) + `yarn`
- `docker` + `docker-compose`

Adacta uses a S3 compatible storage for file uploads. If you do not want to use a hosted solution for S3, you can use
MinIO (https://min.io/) instead (untested).

There is a [script](#running-the-copy-script) that is used to copy existing data from one environment to another which
greatly simplifies the development process as it allows you to work with a copy of an existing database.
This script requires the following tools:

- `rclone`: https://rclone.org/
- `pg_dump`: Which is usually provided as part of `postgresql`.

  _Note_: Depending on the installation method, the postgresql server component may also be installed and started
  automatically.
  It is recommended to disable/stop this server component and use the server instance created by docker/docker-compose
  instead.

## Setting up the development environment

Create a `dev.env` file within the `env` directory. This file contains key-value pairs that configure the
environment-specific settings such as database connections, S3 storage credentials, and authentication keys.

```env
REPO_SERVER_PORT=5000
REPO_SERVER_PUBLIC_URL=http://localhost:5000/
REPO_SERVER_LOG_LEVEL="trace"

SERVICES_URL="http://localhost:3000"

POSTGRES_HOST="localhost"
POSTGRES_PASSWORD="[ENTER YOUR OWN VALUE]"
POSTGRES_USER="[ENTER YOUR OWN VALUE]"
POSTGRES_DB="[ENTER YOUR OWN VALUE]"

S3_ENDPOINT="[ENTER YOUR OWN VALUE]"
S3_REGION="[ENTER YOUR OWN VALUE]"
S3_ACCESS_KEY="[ENTER YOUR OWN VALUE]"
S3_SECRET_ACCESS_KEY="[ENTER YOUR OWN VALUE]"
S3_BUCKET_NAME="[ENTER YOUR OWN VALUE]"

AUTH_SERVER_JWT_PRIVATE_KEY="[ENTER YOUR OWN VALUE]"
AUTH_SERVER_JWT_PUBLIC_KEY="[ENTER YOUR OWN VALUE]"
```

The `POSTGRES_*` variables are used to configure the database connection. As these values are used by the postgresql
docker container and the repo-server at the same time you are free to choose the values.

The `S3_*` variables are used to configure the S3 compatible storage. Adapt these values to the S3 compatible storage
you are using.

The values of `AUTH_SERVER_JWT_PRIVATE_KEY`, `AUTH_SERVER_JWT_PUBLIC_KEY` are used to configure the JWT RS256 based
authentication.

You can generate a key pair using the following commands (requires `openssl` to be installed):

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

The `private.pem` contains the private key. Replace all newlines with the `\n` character sequence and store it
in `AUTH_SERVER_JWT_PRIVATE_KEY` variable.
The `public.pem` contains the public key. Remove all newlines and store it in `AUTH_SERVER_JWT_PUBLIC_KEY` variable.

## Commands for development

The `dev:*` commands defined in the `package.json` file are used for development. Run all of them concurrently in order
to start the development environment. The `dev` command exists as a shortcut to run all of them.

When developing the server, you may find the terminal output of the `dev` command to be too cluttered. You can run the
server and the remaining `dev:*` commands in separate terminals using the `dev-dev:server` (reads as `dev`
minus `dev:server`) and `dev:server` commands.

The default port for the repo server is `5000` (http://localhost:5000/).
If you visit this URL in your browser, you will be greeted with "Unauthorized". This is normal, as the server requires a
valid JWT token to access the API.

The frontend/webapp is served on port `8080` (http://localhost:8080/).
Use this URL to view the Adacta webapp.

### Tests

Adacta uses [Vitest](https://vitest.dev/) for testing. To run the tests in watch mode, use the
following command:

    yarn test

### Running the copy script

The `copy-repos.ts` script copies repositories from different environments to another, particularly useful for
development, but also for backup and data migration purposes. For example, a common use case is to copy repositories
from the production environment to the development environment so that you can work with real data.

The script requires a `*.env` configuration file for the source and target environments (e.g., `prod.env` for
production, `staging.env` for staging, `dev.env` for development) to be present.

From the parameters in the `*.env` file outlined above, the `copy-repos.ts` requires only the ones pertaining to the
PostgreSQL and S3 configurations, i.e., the `POSTGRES_*` and `S3_*` variables.

The script performs the following operations:

- Loads configurations from `.env` files.
- Prompts for confirmation.
- Copies database schemas/data and S3 resources.

> [!WARNING]
>
> - When asked for confirmation, ensure that the target and source environments are correct before proceeding.
> - Verify the contents of the .env files to avoid destructive operations.

> [!IMPORTANT]
>
> The copy script implements a number of safety measures to prevent accidental data loss:
>
> - It checks if the filename of the referenced target `.env` file starts with `prod`
> - It checks if the target database name contains `prod`
>
> In these cases the script will exit with an error message and no data will be copied.
>
> It is your responsibility to name your `.env` files correctly and to verify the contents of the `.env` files before
> running the script. Do not use a name different from `prod.env` for the production environment!

To run the script, use the following command:

```bash
yarn tsx scripts/copy-repos.ts --source path/to/source.env --target path/to/target.env
```

To copy only specific repositories, append the repository names at the end of the command:

```bash
yarn tsx scripts/copy-repos.ts --source path/to/source.env --target path/to/target.env repo1 repo2 repo3
```

To list all available repositories, run the script without providing any repository names. Note the names of the
repositories you want to clone, abort the script, and provide them as arguments in the next run.

## License

Adacta is licensed under the [MIT License](LICENSE).
